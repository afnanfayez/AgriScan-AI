'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sprout,
  ShieldCheck,
  Sparkles,
  CloudSun,
  Heart,
  Map,
  Boxes,
  Users,
  Bell,
  DollarSign,
  KeyRound,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  FileDown,
  TrendingUp,
} from 'lucide-react';

const THEME_KEY = 'agriscan.theme';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#roles', label: 'For your role' },
  { href: '#pricing', label: 'Pricing' },
];

const STATS = [
  { value: '3', label: 'Grower roles supported' },
  { value: 'CSV · Excel · PDF', label: 'Report exports' },
  { value: 'Email OTP', label: 'Verified sign-up' },
  { value: '$0', label: 'To get started' },
];

const STEPS = [
  {
    icon: Camera,
    step: '01',
    title: 'Capture',
    description: 'Photograph any leaf, stem, or fruit showing signs of stress — from a phone or the field.',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Diagnose',
    description: 'AI vision models identify the issue, severity, and likely cause in seconds.',
  },
  {
    icon: CheckCircle,
    step: '03',
    title: 'Treat',
    description: 'Follow a generated treatment plan and track recovery through the next scan.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI diagnosis',
    description:
      'Vision models return structured diagnosis, severity, symptoms, and treatment steps — with Gemini as an automatic fallback provider.',
    big: true,
  },
  {
    icon: Camera,
    title: 'Plant management',
    description: 'Plants, crop profiles, photos, scan history, notes, and health status in one place.',
  },
  {
    icon: TrendingUp,
    title: 'Yield & risk analytics',
    description: 'Field-level dashboards surface trends before they become losses.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Post questions and share answers with other growers.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Stay on top of scans, reminders, and account events.',
  },
  {
    icon: FileDown,
    title: 'Exports',
    description: 'Download reports as CSV, Excel, or PDF whenever you need them.',
  },
  {
    icon: DollarSign,
    title: 'Billing',
    description: 'Stripe Checkout and Billing Portal manage plans server-side.',
  },
  {
    icon: KeyRound,
    title: 'Secure auth',
    description: 'Supabase Auth with email OTP verification and password reset.',
  },
];

const ROLES = [
  {
    icon: Heart,
    title: 'Home Gardener',
    bullets: ['Plant tracking with photo history', 'AI scans that catch issues early', 'Care reminders that actually stick'],
  },
  {
    icon: Map,
    title: 'Commercial Farmer',
    bullets: ['Field mapping & crop scanner', 'Yield and risk analytics', 'Irrigation & labor logs'],
  },
  {
    icon: Boxes,
    title: 'Nursery Operator',
    bullets: ['Batch inventory tracking', 'Health screening & grading', 'Orders, dispatch & certificates'],
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get started with the basics.',
    features: ['5 AI scans / month', 'Core plant management', 'Community access'],
    highlighted: false,
    cta: 'Start Free',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'For growers who scan often.',
    features: ['Unlimited AI scans', 'Priority model chain', 'Full analytics & exports', 'Field mapping tools'],
    highlighted: true,
    cta: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/mo',
    description: 'For nurseries and larger operations.',
    features: ['Unlimited AI scans', 'Priority model access', 'Nursery & dispatch tools', 'Certificates & grading'],
    highlighted: false,
    cta: 'Get Started',
  },
];

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle color theme"
      aria-pressed={isDark}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-stone-300 bg-white transition-colors dark:border-slate-600 dark:bg-slate-800"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform ${
          isDark ? 'translate-x-6 bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.6)]' : 'translate-x-1 bg-slate-500'
        }`}
      />
    </button>
  );
}

export default function LandingPage() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className="bg-white text-stone-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b border-stone-100 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl p-1.5" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-slate-50">AgriScan AI</span>
          </div>

          <nav className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 sm:inline dark:text-slate-400 dark:hover:text-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-500/10" />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-900/50 dark:bg-emerald-500/10">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                AI Multimodal Engine · Live
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl dark:text-slate-50">
              Diagnose plant health <span className="text-emerald-600 dark:text-emerald-400">before it spreads.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-500 dark:text-slate-400">
              AgriScan AI turns a photo into a structured diagnosis and treatment plan — built for home gardeners,
              commercial farmers, and nursery operators alike.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="flex items-center justify-center space-x-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                <span>Get Started Free</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center rounded-xl border border-stone-200 px-6 py-3.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              {[
                { icon: ShieldCheck, text: 'OTP-verified auth' },
                { icon: CloudSun, text: 'Weather & risk alerts' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-stone-500 dark:text-slate-400">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product mockup card */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-5 -top-5 -z-10 h-full w-full rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-500/5" />
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div
                className="relative flex h-36 items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #134e3a 0%, #0f2f22 60%, #0a1f17 100%)' }}
              >
                <Camera className="h-8 w-8 text-emerald-300/70" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Scan complete
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                      Tomato · Solanum lycopersicum
                    </p>
                    <p className="mt-0.5 text-base font-bold text-stone-900 dark:text-slate-50">Early Blight Detected</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    Medium
                  </span>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-slate-400">
                    <span>Diagnosis confidence</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: '94%', background: 'linear-gradient(90deg, #059669, #34d399)' }}
                    />
                  </div>
                </div>

                <ul className="space-y-2 border-t border-stone-100 pt-4 dark:border-slate-800">
                  {[
                    'Remove and destroy infected leaves',
                    'Apply a copper-based fungicide',
                    'Improve airflow between plants',
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-2 text-xs text-stone-600 dark:text-slate-300">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="border-y border-stone-100 dark:border-slate-800">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-6 py-10 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-bold text-stone-900 dark:text-slate-50">{stat.value}</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
            From photo to treatment plan
          </h2>
          <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
            Three steps, no guesswork.
          </p>
        </div>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-stone-200 dark:bg-slate-800 sm:block" />
          {STEPS.map(({ icon: Icon, step, title, description }) => (
            <div key={step} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <span className="mt-4 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{step}</span>
              <h3 className="mt-1 text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES (bento) ── */}
      <section id="features" className="bg-stone-50 py-20 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
              Everything you need to keep crops healthy
            </h2>
            <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
              From diagnosis to dispatch, AgriScan AI covers the whole workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description, big }) => (
              <div
                key={title}
                className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 ${
                  big ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-center' : ''
                }`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className={`font-semibold text-stone-900 dark:text-slate-50 ${big ? 'text-xl' : 'text-base'}`}>
                  {title}
                </h3>
                <p className={`mt-2 leading-relaxed text-stone-500 dark:text-slate-400 ${big ? 'text-sm' : 'text-sm'}`}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
            Built for every kind of grower
          </h2>
          <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
            One platform, three workflows — pick the one that fits how you grow.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, bullets }) => (
            <div
              key={title}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-stone-500 dark:text-slate-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-stone-50 py-20 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
              Start free. Upgrade when you need unlimited scans.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlighted
                    ? 'flex flex-col overflow-hidden rounded-2xl border border-emerald-500 bg-white shadow-lg shadow-emerald-500/10 dark:bg-slate-900'
                    : 'flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80'
                }
              >
                {plan.highlighted && (
                  <div
                    className="px-6 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white"
                    style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-stone-900 dark:text-slate-50">{plan.price}</span>
                    <span className="text-sm text-stone-400 dark:text-slate-500">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{plan.description}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-stone-600 dark:text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={
                      plan.highlighted
                        ? 'mt-6 block rounded-xl py-2.5 text-center text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]'
                        : 'mt-6 block rounded-xl border border-stone-200 py-2.5 text-center text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }
                    style={plan.highlighted ? { background: 'linear-gradient(135deg, #059669, #047857)' } : undefined}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative overflow-hidden py-20 text-center" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to protect your crops?</h2>
          <p className="mt-3 text-sm text-emerald-50/90 sm:text-base">
            Join gardeners, farmers, and nurseries already scanning smarter with AgriScan AI.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center space-x-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-700 shadow-lg transition-transform hover:scale-[1.02]"
          >
            <span>Create your free account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-stone-100 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2.5">
                <div className="rounded-lg p-1.5" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                  <Sprout className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-stone-700 dark:text-slate-300">AgriScan AI</span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-500 dark:text-slate-400">
                Instant plant health diagnosis powered by AI vision models — built for gardeners, farmers, and
                nurseries.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Product</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Account</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link href="/forgot-password" className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100">
                    Reset password
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-stone-100 pt-6 text-xs text-stone-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
            <span>&copy; 2026 AgriScan AI. All rights reserved.</span>
            <span>Built for growers, farmers, and nurseries.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
