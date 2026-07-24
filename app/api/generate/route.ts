import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const defaultSystemPrompt = `You are an expert at writing concise, professional cold emails for job applications.

Write a short professional email tailored to the job description. Open with a specific hook, connect the candidate's value to the role in one or two sentences, include the candidate's portfolio URL as a visible clickable link, and sign off with their full name. Use the requested language and the candidate's CV context accurately; never invent qualifications. Keep it under 120 words. Return JSON only in this shape: {"subject":"...","body":"..."}. The body must be valid HTML using <p> tags.`;

function getSupabaseFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );
  return { supabase, token };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = getSupabaseFromRequest(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body?.jobDescription?.trim()) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key') {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing or is still a placeholder in .env' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, portfolio_url, linkedin_url, accent_color, text_color, font_family, signature_html')
      .eq('id', userData.user.id)
      .maybeSingle();

    const fullName = profile?.full_name || '';
    const portfolioUrl = profile?.portfolio_url || '';
    const userMessage = `Job description:\n${body.jobDescription}\n\nCandidate details:\n- Full name: ${fullName || 'the candidate'}\n- Portfolio URL: ${portfolioUrl || '(not provided — omit the portfolio link)'}\n- LinkedIn: ${profile?.linkedin_url || '(not provided)'}\n- Required output language: ${body.language || 'English'}\n${body.recipientName ? `- Recipient name: ${body.recipientName}` : ''}\n\nCandidate CV / professional background:\n${body.candidateContext?.trim() || '(No additional CV context provided. Use only the profile and job description.)'}\n\nFirst identify the strongest relevant experience from the candidate context, then write the email. Do not claim skills or experience that are not provided. Return JSON only.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: body.systemPrompt?.trim() || defaultSystemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Gemini request failed (${response.status}): ${await response.text()}` }, { status: 502 });
    }

    const result = await response.json();
    const content = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('');
    if (!content) return NextResponse.json({ error: 'AI returned no content' }, { status: 502 });

    const generated = JSON.parse(content) as { subject?: string; body?: string };
    if (!generated.subject || !generated.body) {
      return NextResponse.json({ error: 'AI response is missing a subject or body' }, { status: 502 });
    }

    const accent = profile?.accent_color || '#2563eb';
    const text = profile?.text_color || '#1e293b';
    const font = profile?.font_family || 'Inter, Arial, sans-serif';
    const styledBody = generated.body.replace(
      /(<a\s+)([^>]*>)/gi,
      (_, prefix: string, rest: string) => `${prefix}style="color:${accent};text-decoration:underline;" ${rest}`
    );
    const signoff = fullName ? `<p style="margin-top:16px;">Best,<br/><strong style="color:${accent};">${escapeHtml(fullName)}</strong></p>` : '';
    const signature = profile?.signature_html ? `<div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px;">${profile.signature_html}</div>` : '';

    return NextResponse.json({
      subject: generated.subject,
      body: `<div style="font-family:${font};color:${text};font-size:15px;line-height:1.6;">${styledBody}${signoff}${signature}</div>`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
