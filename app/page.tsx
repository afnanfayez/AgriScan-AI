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
  ChevronRight,
} from 'lucide-react';

const ROLES = [
  {
    icon: Heart,
    title: 'Home Gardener',
    description: 'Track your plants, scan for issues, and get care reminders so nothing gets forgotten.',
  },
  {
    icon: Map,
    title: 'Commercial Farmer',
    description: 'Map fields, scan crops at scale, and watch yield and risk analytics with irrigation logs.',
  },
  {
    icon: Boxes,
    title: 'Nursery Operator',
    description: 'Manage batch inventory, run health screening and grading, and handle orders and certificates.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI diagnosis',
    description: 'Vision models return structured diagnosis, severity, symptoms, and treatment steps in seconds.',
  },
  {
    icon: Camera,
    title: 'Plant management',
    description: 'Plants, crop profiles, photos, scan history, notes, reminders, and health status in one place.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Post questions and share answers with other growers facing the same problems.',
  },
  {
    icon: Bell,
    title: 'Notifications & exports',
    description: 'Stay on top of events, then export reports to CSV, Excel, or PDF whenever you need them.',
  },
  {
    icon: DollarSign,
    title: 'Billing',
    description: 'Stripe Checkout and Billing Portal manage Free, Pro, and Enterprise plans server-side.',
  },
  {
    icon: KeyRound,
    title: 'Auth',
    description: 'Supabase Auth with email OTP verification and secure password reset built in.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: '5 AI scans per month to get started.',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'Unlimited AI scans with the fastest model chain.',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/mo',
    description: 'Unlimited AI scans with priority model access.',
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-white text-stone-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b border-stone-100 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div
              className="rounded-xl p-1.5"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-slate-50">
              AgriScan AI
            </span>
          </div>
          <div className="flex items-center space-x-5">
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
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a1f0f 0%, #0d2b1a 60%, #0f1f2e 100%)' }}
      >
        <div className="absolute inset-0">
          <div
            className="absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-0 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)' }}
          />
          <div
            className="absolute left-0 top-0 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,95,70,0.25) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <div className="mb-6 inline-flex items-center space-x-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              AI Multimodal Engine &middot; Live
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Smart Plant{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Health Intelligence
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-200/95 sm:text-lg">
            Instant disease diagnosis powered by AI vision models. Protect your crops before it&apos;s too late.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex w-full items-center justify-center space-x-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] sm:w-auto"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <span>Get Started Free</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-6 py-3.5 text-center text-sm font-semibold text-emerald-100 backdrop-blur-sm transition-colors hover:bg-emerald-950/70 sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { icon: ShieldCheck, text: 'Bank-grade encrypted auth' },
              { icon: Sparkles, text: 'AI-powered treatment plans' },
              { icon: CloudSun, text: 'Localized weather & risk alerts' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center space-x-2">
                <Icon className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-xs font-medium text-stone-100">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
            Built for every kind of grower
          </h2>
          <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
            One platform, three workflows — pick the one that fits how you grow.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-stone-50 py-20 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
              Everything you need to keep crops healthy
            </h2>
            <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
              From diagnosis to dispatch, AgriScan AI covers the whole workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
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
                  ? 'relative rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-lg shadow-emerald-500/10 dark:bg-slate-900'
                  : 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'
              }
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  Most Popular
                </span>
              )}
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                {plan.name}
              </h3>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-3xl font-extrabold text-stone-900 dark:text-slate-50">{plan.price}</span>
                {plan.period && <span className="text-sm text-stone-400 dark:text-slate-500">{plan.period}</span>}
              </div>
              <p className="mt-3 flex items-start space-x-2 text-sm text-stone-500 dark:text-slate-400">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{plan.description}</span>
              </p>
              <Link
                href="/register"
                className={
                  plan.highlighted
                    ? 'mt-6 block rounded-xl py-2.5 text-center text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.02]'
                    : 'mt-6 block rounded-xl border border-stone-200 py-2.5 text-center text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                }
                style={plan.highlighted ? { background: 'linear-gradient(135deg, #059669, #047857)' } : undefined}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-stone-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center space-x-2.5">
            <div
              className="rounded-lg p-1.5"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <Sprout className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-700 dark:text-slate-300">AgriScan AI</span>
          </div>
          <div className="flex items-center space-x-6 text-xs text-stone-400 dark:text-slate-500">
            <Link href="/login" className="transition-colors hover:text-stone-600 dark:hover:text-slate-300">
              Sign In
            </Link>
            <Link href="/register" className="transition-colors hover:text-stone-600 dark:hover:text-slate-300">
              Create account
            </Link>
            <span>&copy; 2026 AgriScan AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
