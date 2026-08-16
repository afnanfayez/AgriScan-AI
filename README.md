# AgriScan AI

AI-powered plant health inspection, crop scouting, and farm operations platform.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Vision%20AI-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com/)

Live demo: [agriscan-ai-seven.vercel.app/login](https://agriscan-ai-seven.vercel.app/login)

---

## Overview

A full-stack Next.js app that diagnoses plant health from photos and manages agricultural workflows for three roles: **Home Gardener** (plant tracking, care reminders, scans), **Commercial Farmer** (field mapping, crop scanner, yield/risk analytics, irrigation logs), and **Nursery Operator** (batch inventory, health screening, grading, orders/dispatch, certificates).

---

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Farmer | `carlos.farmer@agriscan-test.dev` | `FarmerPass#2026` |
| Gardener | `layla.gardener@agriscan-test.dev` | `GardenerPass#2026` |
| Nursery | `mei.nursery@agriscan-test.dev` | `NurseryPass#2026` |

Test-only credentials — do not reuse elsewhere.

---

## Core Features

| Area | What it does |
| --- | --- |
| AI diagnosis | OpenAI vision models return structured diagnosis, severity, symptoms, and treatment steps. Gemini is a fallback provider, switchable via one env var. |
| Plant management | Plants, crop profiles, photos, scan history, notes, reminders, health status. |
| Farmer / Nursery ops | Field map, crop scanner, yield/risk dashboards, irrigation logs — or batches, screening, grading, orders, certificates. |
| Community | Posts and comments for shared agricultural questions. |
| Notifications & exports | Event tracking plus CSV/Excel/PDF reports. |
| Billing | Stripe Checkout, Billing Portal, and webhooks manage Free/Pro/Enterprise server-side. |
| Auth | Supabase Auth with email OTP verification and password reset. |

---

## Subscription Plans

| Plan | Price | AI scan quota | Model chain |
| --- | ---: | --- | --- |
| Free | $0 | 5/month | `gpt-5.6-luna` → `gpt-4o-mini` |
| Pro | $29/mo | Unlimited | `gpt-5.6-terra` → `gpt-5.6-luna` → `gpt-4o` |
| Enterprise | $149/mo | Unlimited | `gpt-5.6-sol` → `gpt-5.6-terra` → `gpt-5.6-luna` |

Paid access is granted only after Stripe webhook synchronization.

---

## Tech Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Auth, Postgres, RLS) · OpenAI (`openai`, Gemini fallback via `@google/genai`) · Stripe · Leaflet/Recharts · CSV/ExcelJS/jsPDF exports

---

## Project Structure

```text
app/        Routes: dashboard, register/login, API routes
components/ Role-specific dashboard sections, shared UI, auth-context.tsx
services/
  ai/       Provider-neutral image analysis (contract, OpenAI/Gemini providers, model chains)
  auth/     Registration, session, onboarding, password reset
  *-service.ts  Domain services (scans, farms, nursery, billing, etc.)
lib/        Server helpers (auth, stripe, supabase)
utils/supabase/  Browser/server/middleware Supabase clients
```

---

## Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.example` — it documents every variable inline. Core requirements: Supabase URL/keys, `OPENAI_API_KEY`, `APP_URL`, Stripe keys/price IDs.

**Auth emails** are sent by Supabase Auth, not this app — SMTP and templates are configured in the Supabase dashboard. Setup and troubleshooting: **[docs/auth-emails.md](docs/auth-emails.md)**.

**AI provider** is switchable via `AI_PROVIDER=openai|gemini`, no rebuild needed. Verify credentials and model chain before deploying:

```bash
node scripts/verify-openai.mjs path/to/crop-photo.jpg
```

---

## Database Setup

Run in Supabase SQL Editor, in order:

1. `supabase_schema.sql`
2. `supabase_rls_patch.sql`
3. `supabase_role_features_patch.sql`
4. `supabase_new_roles_patch.sql`
5. `supabase_remove_agribusiness_role_patch.sql`
6. `supabase_billing_patch.sql`
7. `supabase_service_role_grant_fix.sql`
8. `supabase_auth_emails_patch.sql`

---

## Local Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
npx tsc --noEmit  # type-check
pnpm build
```

> Windows note: `output: 'standalone'` can fail its final trace-copy step if symlink creation is restricted, even after a successful build.

---

## Stripe Billing Flow

Client requests `/api/billing/checkout` → server validates user/plan → Stripe Checkout created → user pays → Stripe webhook hits `/api/billing/webhook` → webhook syncs `subscriptions` and `profiles.plan`.

The client never grants itself a paid plan.

---

## Available Scripts

```bash
pnpm dev      # Start Next.js in development
pnpm build    # Production build
pnpm start    # Start the production server
pnpm lint     # Run ESLint
pnpm clean    # Run Next clean
```

---

## Notes

- Three operation types only: `Gardener`, `Farmer`, `Nursery`.
- Free: 5 AI analyses/month. Pro/Enterprise: unlimited.
- Exports: CSV, Excel, PDF.
- Billing state is managed entirely through Stripe-hosted pages and webhooks.
