import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );
  return { supabase, token };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = getSupabaseFromRequest(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body?.to || !body?.subject || !body?.html) {
      return NextResponse.json({ error: 'to, subject, and html are required' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey === 'your_new_resend_key') {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing or is still a placeholder in .env' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_address, full_name')
      .eq('id', userData.user.id)
      .maybeSingle();

    const fromEmail = profile?.email_address || userData.user.email;
    if (!fromEmail) return NextResponse.json({ error: 'Set your reply-to email in Settings.' }, { status: 400 });

    const fromName = body.fromName || profile?.full_name || 'Mailflow';
    const to = body.toName ? `${body.toName} <${body.to}>` : body.to;
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${fromName} <mail@mailflow.app>`,
        reply_to: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: body.subject,
        html: body.html,
      }),
    });

    if (!resendResponse.ok) {
      const details = await resendResponse.text();
      if (body.emailId) await supabase.from('email_history').update({ status: 'failed', error_message: details }).eq('id', body.emailId);
      return NextResponse.json({ error: `Resend error (${resendResponse.status}): ${details}` }, { status: 502 });
    }

    const sent = await resendResponse.json();
    if (body.emailId) {
      await supabase.from('email_history').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', body.emailId);
    }
    return NextResponse.json({ success: true, messageId: sent?.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
