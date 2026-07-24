import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendRequest {
  emailId?: string;
  to: string;
  toName?: string;
  subject: string;
  html: string;
  fromName?: string;
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

    const body = await req.json().catch(() => null) as SendRequest | null;
    if (!body || !body.to || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({ error: "to, subject, and html are required" }),
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("email_address, full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    const fromEmail = profile?.email_address || userData.user.email;
    if (!fromEmail) {
      return new Response(
        JSON.stringify({ error: "No verified from-email configured. Set your reply-to email in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Resend API key is not configured. Add RESEND_API_KEY as an edge function secret and verify your sending domain at resend.com/domains." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromName = body.fromName || profile?.full_name || "Mailflow";
    const toField = body.toName ? `${body.toName} <${body.to}>` : body.to;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <mail@mailflow.app>`,
        reply_to: `${fromName} <${fromEmail}>`,
        to: [toField],
        subject: body.subject,
        html: body.html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      let status = "failed";
      if (body.emailId) {
        await supabase
          .from("email_history")
          .update({ status, error_message: errText })
          .eq("id", body.emailId);
      }
      return new Response(
        JSON.stringify({ error: `Resend error (${resendRes.status}): ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendRes.json();

    if (body.emailId) {
      await supabase
        .from("email_history")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", body.emailId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
