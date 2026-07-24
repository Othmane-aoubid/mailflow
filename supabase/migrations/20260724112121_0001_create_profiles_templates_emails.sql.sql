/*
# Create core application schema (profiles, templates, email_history)

## Purpose
Multi-user job-application email assistant. Each signed-in user owns their
profile (static personal data + email formatting preferences), reusable email
templates, and generated email history. Sending is also tracked.

## 1. New Tables

### profiles
- `id` (uuid, primary key, matches auth.users.id) — one row per user.
- `full_name` (text, not null) — signer name used in generated emails.
- `portfolio_url` (text) — Vercel portfolio URL injected into emails.
- `linkedin_url` (text) — LinkedIn profile URL.
- `email_address` (text) — preferred sending/from email address.
- `accent_color` (text) — hex color used to style generated email HTML (e.g. "#2563eb").
- `text_color` (text) — hex color for email body text.
- `font_family` (text) — preferred email font family.
- `signature_html` (text) — optional HTML signature appended to emails.
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### templates
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users, cascade delete) — owner.
- `name` (text, not null) — template label.
- `description` (text) — short note about when to use it.
- `system_prompt` (text, not null) — the instruction sent to the AI.
- `tone` (text) — e.g. "Professional", "Friendly", "Concise".
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### email_history
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid(), references auth.users, cascade delete) — owner.
- `recipient_email` (text) — who the email is (or will be) sent to.
- `recipient_name` (text) — optional recipient display name.
- `subject` (text, not null) — email subject line.
- `body_html` (text, not null) — generated rich-text email body (HTML).
- `job_description` (text) — the pasted job offer that generated this email.
- `template_id` (uuid, nullable, references templates, on delete set null) — template used, if any.
- `status` (text, not null, default 'draft') — one of: draft, sent, failed.
- `sent_at` (timestamptz, nullable) — when the email was sent.
- `error_message` (text, nullable) — failure detail when status = failed.
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## 2. Security (RLS)
- Enable RLS on all three tables.
- profiles: a user can read/update only their own profile (id = auth.uid()).
  Inserts are handled via a trigger (see below) so no direct INSERT policy; we
  still allow it defensively for authenticated users inserting their own row.
- templates: full owner-scoped CRUD (user_id = auth.uid()).
- email_history: full owner-scoped CRUD (user_id = auth.uid()).

## 3. Automation
- `handle_new_user()` trigger function: when a new auth.users row is created,
  insert a corresponding empty profile row. This guarantees every signed-up
  user has a profile to edit (the Settings page otherwise needs an upsert).
- Trigger `on_auth_user_created` fires AFTER INSERT on auth.users.

## 4. Indexes
- `templates_user_id_idx` on templates(user_id).
- `email_history_user_id_idx` on email_history(user_id).
- `email_history_created_at_idx` on email_history(created_at desc) for listing.

## 5. Notes
- owner columns use `DEFAULT auth.uid()` so frontend inserts that omit
  user_id still satisfy WITH CHECK (auth.uid() = user_id).
- No destructive operations; idempotent statements used.
*/

-- ---- profiles ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  portfolio_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  email_address text DEFAULT '',
  accent_color text DEFAULT '#2563eb',
  text_color text DEFAULT '#1e293b',
  font_family text DEFAULT 'Inter, Arial, sans-serif',
  signature_html text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- templates ----
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  system_prompt text NOT NULL,
  tone text DEFAULT 'Professional',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_templates" ON public.templates;
CREATE POLICY "select_own_templates" ON public.templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_templates" ON public.templates;
CREATE POLICY "insert_own_templates" ON public.templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_templates" ON public.templates;
CREATE POLICY "update_own_templates" ON public.templates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_templates" ON public.templates;
CREATE POLICY "delete_own_templates" ON public.templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- email_history ----
CREATE TABLE IF NOT EXISTS public.email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text DEFAULT '',
  recipient_name text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  job_description text DEFAULT '',
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_emails" ON public.email_history;
CREATE POLICY "select_own_emails" ON public.email_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_emails" ON public.email_history;
CREATE POLICY "insert_own_emails" ON public.email_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_emails" ON public.email_history;
CREATE POLICY "update_own_emails" ON public.email_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_emails" ON public.email_history;
CREATE POLICY "delete_own_emails" ON public.email_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- indexes ----
CREATE INDEX IF NOT EXISTS templates_user_id_idx ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS email_history_user_id_idx ON public.email_history(user_id);
CREATE INDEX IF NOT EXISTS email_history_created_at_idx ON public.email_history(created_at DESC);

-- ---- trigger: auto-create profile on signup ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email_address)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- updated_at maintenance ----
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS templates_touch_updated_at ON public.templates;
CREATE TRIGGER templates_touch_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS email_history_touch_updated_at ON public.email_history;
CREATE TRIGGER email_history_touch_updated_at
  BEFORE UPDATE ON public.email_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
