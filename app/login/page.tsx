'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MailflowLogo } from '@/components/brand/mailflow-logo';
import { Sparkles, Mail, Link2, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      router.push('/dashboard/compose');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <MailflowLogo className="h-8 w-8" />
            <span className="text-xl font-semibold tracking-tight">Mailflow</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to generate and send job application emails.
          </p>

          <Card className="mt-8 border-border/60 shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg">Sign in</CardTitle>
              <CardDescription>Enter your email and password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                No account yet?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 px-12 py-12 text-white lg:flex">
        <div className="absolute inset-0 gradient-brand opacity-90" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <MailflowLogo className="h-8 w-8 text-white" />
          <span className="text-xl font-semibold">Mailflow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Land your next role with emails that actually get read.
          </h2>
          <p className="mt-4 text-white/80">
            Paste a job description, let AI craft a tailored cold email with your
            portfolio link, and send it — all in one place.
          </p>

          <ul className="mt-10 space-y-5">
            <Feature icon={Sparkles} title="AI-tailored emails">
              Every email is written specifically for the job description you paste.
            </Feature>
            <Feature icon={Link2} title="Your portfolio, front and center">
              Your Vercel portfolio link is automatically woven into every message.
            </Feature>
            <Feature icon={Mail} title="Send from the app">
              Send directly to hiring managers without ever leaving Mailflow.
            </Feature>
            <Feature icon={ShieldCheck} title="Reusable templates">
              Save winning templates and reuse them across applications.
            </Feature>
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} Mailflow
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-white/70">{children}</p>
      </div>
    </li>
  );
}
