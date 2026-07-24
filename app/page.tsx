'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { MailflowLogo } from '@/components/brand/mailflow-logo';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Link2,
  Mail,
  History,
  LayoutTemplate,
  Send,
  Zap,
  Check,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard/compose');
    }
  }, [loading, session, router]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <MailflowLogo className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">Mailflow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-brand opacity-[0.07]" />
        <div className="absolute -right-40 top-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -left-40 top-40 -z-10 h-[24rem] w-[24rem] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered cold outreach for job seekers
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Generate the perfect job application email in{' '}
              <span className="text-gradient">seconds</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Paste any job description, and Mailflow writes a tailored,
              professional cold email — your portfolio link included — ready to
              copy or send directly.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start for free <Zap className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Hero preview card */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-slate-900/5">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-muted-foreground">
                  Re: Senior Frontend Engineer — Acme Corp
                </span>
              </div>
              <div className="space-y-3 p-6 text-left">
                <p className="text-sm leading-relaxed">Hi Sarah,</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  I came across the Senior Frontend Engineer role at Acme and was
                  struck by your team&apos;s focus on design-system craftsmanship.
                  Over the past four years I&apos;ve built and maintained a
                  component library used across 40+ surfaces…
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You can see my work here:{' '}
                  <span className="font-medium text-primary underline">
                    my-portfolio.vercel.app
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Best,
                  <br /> Jane Doe
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to apply faster
            </h2>
            <p className="mt-4 text-muted-foreground">
              Stop rewriting the same email from scratch. Mailflow handles the
              heavy lifting so you can focus on the applications themselves.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={Sparkles}
              title="AI-tailored emails"
              desc="Paste a job description and get a personalized cold email that speaks directly to the role."
            />
            <Feature
              icon={Link2}
              title="Portfolio injection"
              desc="Your Vercel portfolio URL and signature are woven into every email automatically."
            />
            <Feature
              icon={Mail}
              title="Send from the app"
              desc="Send directly to hiring managers without copying and pasting between tabs."
            />
            <Feature
              icon={History}
              title="Email history"
              desc="Every generated email is saved, so you can revisit, resend, or track what worked."
            />
            <Feature
              icon={LayoutTemplate}
              title="Reusable templates"
              desc="Save your best-performing prompts as templates and reuse them across applications."
            />
            <Feature
              icon={Check}
              title="Rich-text copy"
              desc="One click preserves all formatting, colors, and clickable links for your email client."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-8 py-14 text-center text-white">
            <div className="absolute inset-0 gradient-brand opacity-90" />
            <div className="relative z-10 mx-auto max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to apply smarter?
              </h2>
              <p className="mt-4 text-white/80">
                Create a free account and send your first tailored email in
                under a minute.
              </p>
              <Button size="lg" variant="secondary" asChild className="mt-8">
                <Link href="/signup">
                  Get started free <Send className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2">
            <MailflowLogo className="h-6 w-6" />
            <span className="font-medium">Mailflow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mailflow
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
