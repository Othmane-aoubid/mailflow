'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/supabase-browser';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  History as HistoryIcon,
  Search,
  Copy,
  Check,
  Trash2,
  Mail,
  Calendar,
  Loader2,
  Inbox,
} from 'lucide-react';
import type { EmailHistory } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
};

export default function HistoryPage() {
  const supabase = createClient();
  const [emails, setEmails] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmailHistory | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load history');
    } else {
      setEmails((data as EmailHistory[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const filtered = emails.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.subject.toLowerCase().includes(q) ||
      e.recipient_email.toLowerCase().includes(q) ||
      e.recipient_name.toLowerCase().includes(q)
    );
  });

  async function handleCopy(email: EmailHistory) {
    try {
      const html = email.body_html;
      const plain = html.replace(/<[^>]+>/g, '');
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await supabase.from('email_history').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Email deleted');
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every email you generate or send is saved here.
          </p>
        </div>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by subject, recipient, or name…"
          className="pl-9"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No emails yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate your first email in the Compose tab.
          </p>
          <Button asChild className="mt-4" size="sm">
            <a href="/dashboard/compose">Go to Compose</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <Card
              key={email.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelected(email)}
            >
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                      {email.subject || '(no subject)'}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email.recipient_email || 'No recipient'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(email.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className={cn('shrink-0', STATUS_STYLES[email.status])}>
                    {email.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4 pt-0">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {email.body_html.replace(/<[^>]+>/g, ' ').trim()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg">{selected?.subject}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                To:{' '}
                <span className="font-medium text-foreground">
                  {selected?.recipient_name
                    ? `${selected.recipient_name} <${selected.recipient_email}>`
                    : selected?.recipient_email || '—'}
                </span>
              </span>
              <span>
                Status:{' '}
                <span className="font-medium text-foreground">
                  {selected?.status}
                </span>
              </span>
              {selected?.sent_at && (
                <span>
                  Sent:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(selected.sent_at).toLocaleString()}
                  </span>
                </span>
              )}
            </div>
            {selected?.error_message && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {selected.error_message}
              </div>
            )}
            <div
              className="email-preview max-h-[50vh] overflow-y-auto scrollbar-thin rounded-lg border bg-white p-5"
              dangerouslySetInnerHTML={{ __html: selected?.body_html || '' }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => selected && handleDelete(selected.id)}
              disabled={deleting === selected?.id}
            >
              {deleting === selected?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
            <Button onClick={() => selected && handleCopy(selected)}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
