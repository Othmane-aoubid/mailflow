'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { createClient } from '@/lib/supabase/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  Wand2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { Template } from '@/lib/types/database';

interface GeneratedEmail {
  subject: string;
  body: string;
}

export default function ComposePage() {
  const { profile, session } = useAuth();
  const supabase = createClient();
  const [jobDescription, setJobDescription] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [language, setLanguage] = useState('English');
  const [candidateContext, setCandidateContext] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);
  const [templateId, setTemplateId] = useState<string>('default');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedEmail | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates((data as Template[]) ?? []);
    setTemplatesLoaded(true);
  }, [supabase, templatesLoaded]);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast.error('Paste a job description first');
      return;
    }
    if (!profile?.portfolio_url) {
      toast.error('Add your portfolio URL in Settings to generate emails');
      return;
    }
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const selectedTemplate = templates.find((t) => t.id === templateId);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          jobDescription,
          systemPrompt: selectedTemplate?.system_prompt,
          recipientName,
          recipientEmail,
          language,
          candidateContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenerated({ subject: data.subject, body: data.body });
      toast.success('Email generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const response = await fetch('/api/extract-cv', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not read the CV');

      setCandidateContext(data.text);
      setCvFileName(data.fileName);
      toast.success('CV added as candidate context');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the CV');
    } finally {
      setUploadingCv(false);
      event.target.value = '';
    }
  };

  const copyToClipboard = async () => {
    if (!generated || !previewRef.current) return;
    try {
      // Copy rich HTML to clipboard so formatting + links are preserved
      const html = previewRef.current.innerHTML;
      const text = previewRef.current.innerText;
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopied(true);
      toast.success('Copied — formatting and links preserved');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleSend = async () => {
    if (!generated) return;
    if (!recipientEmail.trim()) {
      toast.error('Add a recipient email to send');
      return;
    }
    setSending(true);

    try {
      // Save draft to history first (so we can track status)
      const { data: saved, error: saveErr } = await supabase
        .from('email_history')
        .insert({
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: generated.subject,
          body_html: generated.body,
          job_description: jobDescription,
          template_id: templateId === 'default' ? null : templateId,
          status: 'draft',
        })
        .select()
        .maybeSingle();

      if (saveErr) throw saveErr;
      const emailId = saved?.id;

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          emailId,
          to: recipientEmail,
          toName: recipientName,
          subject: generated.subject,
          html: generated.body,
          fromName: profile?.full_name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');

      toast.success('Email sent');
      setSendOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const profileIncomplete =
    !profile?.full_name || !profile?.portfolio_url;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a job description and generate a tailored cold email.
        </p>
      </div>

      {profileIncomplete && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">
              Complete your profile to get the best results
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Add your full name and Vercel portfolio URL in{' '}
              <a href="/dashboard/settings" className="font-medium text-primary underline">
                Settings
              </a>{' '}
              so emails are personalized and include your work.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job description</CardTitle>
              <CardDescription>
                Paste the full job offer or description here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job title, company, requirements, and any other details…"
                className="min-h-[260px] resize-y"
                onFocus={loadTemplates}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{jobDescription.length} characters</span>
                {jobDescription && (
                  <button
                    type="button"
                    onClick={() => setJobDescription('')}
                    className="hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipient & template</CardTitle>
              <CardDescription>
                Optional — improves personalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Recipient name</Label>
                  <Input
                    id="recipient_name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Sarah Chen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Recipient email</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="sarah@acme.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={templateId}
                  onValueChange={setTemplateId}
                  onOpenChange={(open) => {
                    if (open) loadTemplates();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Default (professional)
                    </SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && templatesLoaded && (
                  <p className="text-xs text-muted-foreground">
                    No templates yet —{' '}
                    <a
                      href="/dashboard/templates"
                      className="text-primary underline"
                    >
                      create one
                    </a>
                    .
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Language & candidate context</CardTitle>
              <CardDescription>
                Choose the email language and paste CV details so the AI can match the candidate to the role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Email language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate_context">CV or professional background</Label>
                <Input
                  id="cv_upload"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleCvUpload}
                  disabled={uploadingCv}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  {uploadingCv
                    ? 'Reading CV…'
                    : cvFileName
                      ? `${cvFileName} loaded — you can review or edit its extracted text below.`
                      : 'Upload a PDF, DOCX, or TXT CV (up to 5 MB).'}
                </p>
                <Textarea
                  id="candidate_context"
                  value={candidateContext}
                  onChange={(event) => setCandidateContext(event.target.value)}
                  placeholder="Paste the candidate's CV, skills, projects, achievements, education, or relevant experience here…"
                  className="min-h-[180px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  The extracted text is used only for the current email and is not stored. The AI is instructed not to invent experience.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerate}
            disabled={generating || !jobDescription.trim()}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Generate email
              </>
            )}
          </Button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <Card className="flex h-full flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Generated email</CardTitle>
                <CardDescription>
                  Rich-text preview with formatting and links.
                </CardDescription>
              </div>
              {generated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> AI
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {error ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
                  <p className="text-sm font-medium">Generation failed</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    {error}
                  </p>
                </div>
              ) : !generated ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Your generated email will appear here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                      {generated.subject}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <Label className="text-xs text-muted-foreground">Body</Label>
                    <div
                      ref={previewRef}
                      className="email-preview mt-1 max-h-[420px] min-h-[200px] overflow-y-auto rounded-lg border bg-white p-5"
                      dangerouslySetInnerHTML={{ __html: generated.body }}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={copyToClipboard}
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4 text-success" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                    <Button onClick={() => setSendOpen(true)} className="flex-1">
                      <Send className="mr-2 h-4 w-4" /> Send
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send email</DialogTitle>
            <DialogDescription>
              Review and send this email directly to the recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">
                  {recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail || '—'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-medium">{generated?.subject}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">
                  {profile?.email_address || 'your reply-to email'}
                </span>
              </div>
            </div>
            {!recipientEmail && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                Add a recipient email above before sending.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !recipientEmail.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Send now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
