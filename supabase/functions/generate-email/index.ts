import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  jobDescription: string;
  systemPrompt?: string;
  recipientName?: string;
  recipientEmail?: string;
  profile?: {
    full_name?: string;
    portfolio_url?: string;
    linkedin_url?: string;
    accent_color?: string;
    text_color?: string;
    font_family?: string;
    signature_html?: string;
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert at writing concise, professional cold emails for job applications.

Rules:
- Write a SHORT, professional cold email tailored to the provided job description.
- Open with a confident, specific hook that references something in the job description.
- Briefly connect the candidate's value to the role's stated needs (1-2 sentences max).
- ALWAYS include a clickable link to the candidate's Vercel portfolio URL in the body, styled as a visible link.
- Sign off with the candidate's full name.
- Keep the entire email under 120 words. No fluff, no generic buzzwords.
- Return STRICT JSON only: {"subject": "...", "body": "..."}. The body MUST be valid HTML (paragraphs in <p> tags, the portfolio URL as an <a> tag). Do NOT wrap the JSON in markdown fences.`;

function buildStyledEmail(
  bodyHtml: string,
  profile: GenerateRequest["profile"]
): string {
  const accent = profile?.accent_color || "#2563eb";
  const text = profile?.text_color || "#1e293b";
  const font = profile?.font_family || "Inter, Arial, sans-serif";
  const name = profile?.full_name || "";
  const signature = profile?.signature_html || "";

  const linkStyled = bodyHtml.replace(
    /(<a\s+)([^>]*>)/gi,
    (_, prefix: string, rest: string) =>
      `${prefix}style="color:${accent};text-decoration:underline;" ${rest}`
  );

  const signoff = name
    ? `<p style="margin-top:16px;">Best,<br/><strong style="color:${accent};">${escapeHtml(name)}</strong></p>`
    : "";

  return `<div style="font-family:${font};color:${text};font-size:15px;line-height:1.6;">${linkStyled}${signoff}${signature ? `<div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px;">${signature}</div>` : ""}</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null) as GenerateRequest | null;
    if (!body || !body.jobDescription?.trim()) {
      return new Response(
        JSON.stringify({ error: "jobDescription is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("profile read error:", profileErr.message);
    }

    // DB profile is the source of truth; body.profile (if sent) overrides only specific fields
    const dbProfile = (profile ?? {}) as Record<string, unknown>;
    const overrideProfile = (body.profile ?? {}) as Record<string, unknown>;
    const mergedProfile = { ...dbProfile, ...overrideProfile };

    const systemPrompt = body.systemPrompt?.trim()
      ? body.systemPrompt
      : DEFAULT_SYSTEM_PROMPT;

    const fullName = (mergedProfile.full_name as string) || "";
    const portfolioUrl = (mergedProfile.portfolio_url as string) || "";
    const linkedinUrl = (mergedProfile.linkedin_url as string) || "";

    const userMessage = `Job description:
${body.jobDescription}

Candidate details:
- Full name: ${fullName || "the candidate"}
- Portfolio URL: ${portfolioUrl || "(not provided — omit the portfolio link)"}
- LinkedIn: ${linkedinUrl || "(not provided)"}
${body.recipientName ? `- Recipient name: ${body.recipientName}` : ""}

Write the email now. Return JSON only: {"subject": "...", "body": "..."}`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured. Add OPENAI_API_KEY as an edge function secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `OpenAI request failed (${aiRes.status}): ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI returned no content" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { subject?: string; body?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: try to extract JSON from fenced content
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    if (!parsed.subject || !parsed.body) {
      return new Response(
        JSON.stringify({ error: "AI response missing subject or body" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const styledBody = buildStyledEmail(parsed.body, mergedProfile as GenerateRequest["profile"]);

    return new Response(
      JSON.stringify({ subject: parsed.subject, body: styledBody }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
