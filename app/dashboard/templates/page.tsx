'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/supabase-browser';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Save,
} from 'lucide-react';
import type { Template } from '@/lib/types/database';

const TONES = ['Professional', 'Friendly', 'Concise', 'Enthusiastic', 'Formal'];

const EMPTY = {
  name: '',
  description: '',
  system_prompt: '',
  tone: 'Professional',
};

export default function TemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load templates');
    setTemplates((data as Template[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description,
      system_prompt: t.system_prompt,
      tone: t.tone,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.system_prompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('templates')
          .update({
            name: form.name,
            description: form.description,
            system_prompt: form.system_prompt,
            tone: form.tone,
          })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase.from('templates').insert({
          name: form.name,
          description: form.description,
          system_prompt: form.system_prompt,
          tone: form.tone,
        });
        if (error) throw error;
        toast.success('Template created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleDuplicate(t: Template) {
    const { error } = await supabase.from('templates').insert({
      name: `${t.name} (copy)`,
      description: t.description,
      system_prompt: t.system_prompt,
      tone: t.tone,
    });
    if (error) {
      toast.error('Failed to duplicate');
    } else {
      toast.success('Template duplicated');
      load();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save reusable AI instructions to generate emails faster.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <LayoutTemplate className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No templates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a reusable template to customize how the AI writes your emails.
          </p>
          <Button onClick={openCreate} className="mt-4" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{t.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1.5">
                      {t.tone}
                    </Badge>
                  </div>
                </div>
                {t.description && (
                  <CardDescription className="mt-1 line-clamp-2">
                    {t.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end gap-2">
                <p className="line-clamp-3 flex-1 rounded-md bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {t.system_prompt}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(t)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(t)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit template' : 'New template'}
            </DialogTitle>
            <DialogDescription>
              The system prompt tells the AI how to write the email. Use it to
              control tone, length, and emphasis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="t_name">Name</Label>
                <Input
                  id="t_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Short outreach"
                />
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => setForm({ ...form, tone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t_desc">Description (optional)</Label>
              <Input
                id="t_desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="When to use this template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t_prompt">System prompt</Label>
              <Textarea
                id="t_prompt"
                value={form.system_prompt}
                onChange={(e) =>
                  setForm({ ...form, system_prompt: e.target.value })
                }
                placeholder="You are an expert at writing concise, friendly cold emails for startup applications. Keep it under 80 words…"
                className="min-h-[160px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                This replaces the default instruction sent to the AI. Reference
                the candidate details and job description context.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {editing ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
