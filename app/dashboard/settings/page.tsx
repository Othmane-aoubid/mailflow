'use client';

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Eye, Palette, User as UserIcon, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Blue', accent: '#2563eb', text: '#1e293b' },
  { name: 'Emerald', accent: '#059669', text: '#1e293b' },
  { name: 'Slate', accent: '#334155', text: '#1e293b' },
  { name: 'Rose', accent: '#e11d48', text: '#1e293b' },
  { name: 'Amber', accent: '#d97706', text: '#1e293b' },
  { name: 'Teal', accent: '#0d9488', text: '#1e293b' },
];

const FONTS = [
  { label: 'Inter (modern)', value: 'Inter, Arial, sans-serif' },
  { label: 'Georgia (classic)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Helvetica (clean)', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier (monospace)', value: '"Courier New", Courier, monospace' },
];

export default function SettingsPage() {
  const { profile, refreshProfile, user } = useAuth();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    portfolio_url: '',
    linkedin_url: '',
    email_address: '',
    accent_color: '#2563eb',
    text_color: '#1e293b',
    font_family: 'Inter, Arial, sans-serif',
    signature_html: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        email_address: profile.email_address ?? user?.email ?? '',
        accent_color: profile.accent_color ?? '#2563eb',
        text_color: profile.text_color ?? '#1e293b',
        font_family: profile.font_family ?? 'Inter, Arial, sans-serif',
        signature_html: profile.signature_html ?? '',
      });
    }
  }, [profile, user?.email]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: form.full_name,
        portfolio_url: form.portfolio_url,
        linkedin_url: form.linkedin_url,
        email_address: form.email_address,
        accent_color: form.accent_color,
        text_color: form.text_color,
        font_family: form.font_family,
        signature_html: form.signature_html,
      };
      // upsert guarantees the row is created if missing AND updated if it exists
      const { data: saved, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!saved) {
        throw new Error(
          'Save returned no data — the profile may not have been written. Check your session.'
        );
      }
      await refreshProfile();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and email formatting preferences. These are used in every
          generated email.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription>
              Your name and links — injected into every email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_address">Reply-to email</Label>
                <Input
                  id="email_address"
                  type="email"
                  value={form.email_address}
                  onChange={(e) =>
                    setForm({ ...form, email_address: e.target.value })
                  }
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Vercel portfolio URL</Label>
              <Input
                id="portfolio_url"
                type="url"
                value={form.portfolio_url}
                onChange={(e) =>
                  setForm({ ...form, portfolio_url: e.target.value })
                }
                placeholder="https://your-portfolio.vercel.app"
              />
              <p className="text-xs text-muted-foreground">
                This link is automatically woven into every generated email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={form.linkedin_url}
                onChange={(e) =>
                  setForm({ ...form, linkedin_url: e.target.value })
                }
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature_html">
                Email signature (HTML, optional)
              </Label>
              <Textarea
                id="signature_html"
                value={form.signature_html}
                onChange={(e) =>
                  setForm({ ...form, signature_html: e.target.value })
                }
                placeholder="<p>Jane Doe<br/>Frontend Engineer<br/>+1 555 010 203</p>"
                className="min-h-[90px] font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email styling */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Email formatting</CardTitle>
            </div>
            <CardDescription>
              Colors and font used in the generated email preview and copied HTML.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Accent color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        accent_color: c.accent,
                        text_color: c.text,
                      })
                    }
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all',
                      form.accent_color === c.accent
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: c.accent }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accent_color">Custom accent</Label>
                <div className="flex gap-2">
                  <input
                    id="accent_color"
                    type="color"
                    value={form.accent_color}
                    onChange={(e) =>
                      setForm({ ...form, accent_color: e.target.value })
                    }
                    className="h-10 w-12 cursor-pointer rounded-md border bg-card p-1"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(e) =>
                      setForm({ ...form, accent_color: e.target.value })
                    }
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_color">Body text color</Label>
                <div className="flex gap-2">
                  <input
                    id="text_color"
                    type="color"
                    value={form.text_color}
                    onChange={(e) =>
                      setForm({ ...form, text_color: e.target.value })
                    }
                    className="h-10 w-12 cursor-pointer rounded-md border bg-card p-1"
                  />
                  <Input
                    value={form.text_color}
                    onChange={(e) =>
                      setForm({ ...form, text_color: e.target.value })
                    }
                    placeholder="#1e293b"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font_family">Font family</Label>
              <select
                id="font_family"
                value={form.font_family}
                onChange={(e) =>
                  setForm({ ...form, font_family: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <Separator />

            {/* Live preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Eye className="h-4 w-4" /> Live email preview
              </div>
              <div className="overflow-hidden rounded-lg border bg-white p-5">
                <p
                  style={{ color: form.text_color, fontFamily: form.font_family }}
                  className="text-sm leading-relaxed"
                >
                  Hi Hiring Manager,
                </p>
                <p
                  style={{ color: form.text_color, fontFamily: form.font_family }}
                  className="mt-3 text-sm leading-relaxed"
                >
                  I&apos;d love to bring my experience to your team. You can see my
                  work at{' '}
                  <a
                    href={form.portfolio_url || '#'}
                    style={{ color: form.accent_color }}
                    className="underline"
                  >
                    {form.portfolio_url || 'your-portfolio.vercel.app'}
                  </a>
                  .
                </p>
                <p
                  style={{ color: form.text_color, fontFamily: form.font_family }}
                  className="mt-3 text-sm leading-relaxed"
                >
                  Best,
                  <br />
                  <span style={{ color: form.accent_color }} className="font-semibold">
                    {form.full_name || 'Your Name'}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
