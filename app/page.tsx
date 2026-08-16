'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
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

function unsplash(id: string, width: number) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

const IMAGES = {
  hero: unsplash('1500382017468-9049fed747ef', 900),
  captureStep: unsplash('1625246333195-78d9c38ad449', 400),
  treatStep: unsplash('1464226184884-fa280b87c399', 400),
  gardener: unsplash('1416879595882-3373a0480b5b', 600),
  farmer: unsplash('1523741543316-beb7fc7023d8', 600),
  nursery: unsplash('1523348837708-15d4a09cfac2', 600),
  featuresBig: unsplash('1592982537447-7440770cbfc9', 800),
  footer: unsplash('1560493676-04071c5f467b', 1600),
};

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#roles', label: 'For your role' },
  { href: '#pricing', label: 'Pricing' },
];

const STEPS = [
  {
    icon: Camera,
    step: '01',
    title: 'Capture',
    description: 'Photograph any leaf, stem, or fruit showing signs of stress, using a phone in the field.',
    image: IMAGES.captureStep,
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'Diagnose',
    description: 'AI vision models identify the issue, severity, and likely cause in seconds.',
    image: undefined,
  },
  {
    icon: CheckCircle,
    step: '03',
    title: 'Treat',
    description: 'Follow a generated treatment plan and track recovery through the next scan.',
    image: IMAGES.treatStep,
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI diagnosis',
    description:
      'Vision models return structured diagnosis, severity, symptoms, and treatment steps, with Gemini as an automatic fallback provider.',
    big: true,
    image: IMAGES.featuresBig,
  },
  {
    icon: Camera,
    title: 'Plant management',
    description: 'Plants, crop profiles, photos, scan history, notes, and health status in one place.',
    big: false,
    image: undefined,
  },
  {
    icon: TrendingUp,
    title: 'Yield & risk analytics',
    description: 'Field-level dashboards surface trends before they become losses.',
    big: false,
    image: undefined,
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Post questions and share answers with other growers.',
    big: false,
    image: undefined,
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Stay on top of scans, reminders, and account events.',
    big: false,
    image: undefined,
  },
  {
    icon: FileDown,
    title: 'Exports',
    description: 'Download reports as CSV, Excel, or PDF whenever you need them.',
    big: false,
    image: undefined,
  },
  {
    icon: DollarSign,
    title: 'Billing',
    description: 'Stripe Checkout and Billing Portal manage plans server-side.',
    big: false,
    image: undefined,
  },
  {
    icon: KeyRound,
    title: 'Secure auth',
    description: 'Supabase Auth with email OTP verification and password reset.',
    big: false,
    image: undefined,
  },
];

const ROLES = [
  {
    icon: Heart,
    title: 'Home Gardener',
    image: IMAGES.gardener,
    bullets: ['Plant tracking with photo history', 'AI scans that catch issues early', 'Care reminders that actually stick'],
  },
  {
    icon: Map,
    title: 'Commercial Farmer',
    image: IMAGES.farmer,
    bullets: ['Field mapping & crop scanner', 'Yield and risk analytics', 'Irrigation & labor logs'],
  },
  {
    icon: Boxes,
    title: 'Nursery Operator',
    image: IMAGES.nursery,
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

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

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex h-4 w-5 shrink-0 flex-col justify-between">
      <motion.span
        className="h-0.5 w-full rounded-full bg-current"
        animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="h-0.5 w-full rounded-full bg-current"
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className="h-0.5 w-full rounded-full bg-current"
        animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
    <div className="overflow-x-hidden bg-white text-stone-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── HEADER ── */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-20 border-b border-stone-100 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center space-x-2.5">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              className="shrink-0 rounded-xl p-1.5"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              <Sprout className="h-5 w-5 text-white" />
            </motion.div>
            <span className="truncate whitespace-nowrap text-base font-bold tracking-tight text-stone-900 dark:text-slate-50">
              AgriScan AI
            </span>
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

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 md:inline dark:text-slate-400 dark:hover:text-slate-100"
            >
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="hidden md:block">
              <Link
                href="/register"
                className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                Get Started
              </Link>
            </motion.div>
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-600 dark:border-slate-700 dark:text-slate-300 md:hidden"
            >
              <BurgerIcon open={isMobileMenuOpen} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-stone-100 dark:border-slate-800 md:hidden"
            >
              <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="my-2 border-t border-stone-100 dark:border-slate-800" />
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-1 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  Get Started
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <motion.div
          className="absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-500/10"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }}>
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
              AgriScan AI turns a photo into a structured diagnosis and treatment plan, built for home gardeners,
              commercial farmers, and nursery operators alike.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/register"
                  className="group flex items-center justify-center space-x-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  <span>Get Started Free</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl border border-stone-200 px-6 py-3.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Sign In
                </Link>
              </motion.div>
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
          </motion.div>

          {/* Hero image + floating scan-result chip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md pb-10 pl-4 sm:pb-14 sm:pl-10"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src={IMAGES.hero}
                alt="Golden crop field at sunrise"
                fill
                sizes="(max-width: 768px) 90vw, 480px"
                className="object-cover"
                priority
              />
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-0 left-0 w-[calc(100%-2rem)] max-w-[13rem] rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:max-w-[16rem]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Scan complete
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Medium
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-stone-900 dark:text-slate-50">Early Blight Detected</p>
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-stone-500 dark:text-slate-400">
                  <span>Confidence</span>
                  <span>94%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }}
                    initial={{ width: 0 }}
                    animate={{ width: '94%' }}
                    transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
            From photo to treatment plan
          </h2>
          <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">Three steps, no guesswork.</p>
        </motion.div>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-stone-200 dark:bg-slate-800 sm:block" />
          {STEPS.map(({ icon: Icon, step, title, description, image }, index) => (
            <motion.div
              key={step}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="relative flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              {image ? (
                <div className="relative z-10 h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-emerald-200 dark:border-slate-950 dark:ring-emerald-900/50">
                  <Image src={image} alt="" fill sizes="56px" className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/35">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <span className="mt-4 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{step}</span>
              <h3 className="mt-1 text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-slate-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES (bento) ── */}
      <section id="features" className="bg-stone-50 py-20 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
              Everything you need to keep crops healthy
            </h2>
            <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
              From diagnosis to dispatch, AgriScan AI covers the whole workflow.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description, big, image }, index) => (
              <motion.div
                key={title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: (index % 4) * 0.08 }}
                whileHover={{ y: -4 }}
                className={`relative overflow-hidden rounded-2xl border shadow-sm ${
                  big
                    ? 'border-emerald-900/20 sm:col-span-2 lg:col-span-2 lg:row-span-2'
                    : 'border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/80'
                }`}
              >
                {big && image ? (
                  <>
                    <div className="absolute inset-0">
                      <Image src={image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/60 to-emerald-950/20" />
                    </div>
                    <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 lg:min-h-[420px]">
                      <div className="mb-4 inline-flex w-fit rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">{title}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-emerald-50/90">{description}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                      <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base font-semibold text-stone-900 dark:text-slate-50">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-slate-400">{description}</p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
            Built for every kind of grower
          </h2>
          <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
            One platform, three workflows: pick the one that fits how you grow.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, image, bullets }, index) => (
            <motion.div
              key={title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="rounded-lg bg-white/90 p-1.5 backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-emerald-700" />
                  </div>
                  <span className="text-sm font-semibold text-white drop-shadow">{title}</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-2.5">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-stone-500 dark:text-slate-400">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-stone-50 py-20 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-slate-50">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-sm text-stone-500 sm:text-base dark:text-slate-400">
              Start free. Upgrade when you need unlimited scans.
            </p>
          </motion.div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative"
              >
                {plan.highlighted && (
                  <motion.div
                    className="absolute -inset-1.5 -z-10 rounded-[20px] bg-emerald-400/30 blur-lg"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div
                  className={
                    plan.highlighted
                      ? 'flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-500 bg-white shadow-lg dark:bg-slate-900'
                      : 'flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80'
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative overflow-hidden border-t border-stone-100 dark:border-slate-800">
        <div className="absolute inset-0 -z-10">
          <Image src={IMAGES.footer} alt="" fill sizes="100vw" className="object-cover opacity-[0.05] dark:opacity-[0.08]" />
        </div>
        <div className="bg-white/97 dark:bg-slate-950/97">
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
                  Instant plant health diagnosis powered by AI vision models, built for gardeners, farmers, and
                  nurseries.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Create your free account
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                  Product
                </p>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                  Account
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li>
                    <Link
                      href="/login"
                      className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Create account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/forgot-password"
                      className="text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
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
        </div>
      </footer>
    </div>
  );
}
