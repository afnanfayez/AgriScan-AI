# AgriScan AI

AI-powered plant health inspection, crop scouting, and farm operations platform.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Vision%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)

Live demo: [agriscan-ai-seven.vercel.app/login](https://agriscan-ai-seven.vercel.app/login)

---

## Overview

AgriScan AI is a full-stack Next.js application for diagnosing plant health issues from images and managing agricultural workflows across three operation types:

- **Home Gardener**: personal plant tracking, care reminders, AI scans, treatment plans, and garden health overview.
- **Commercial Farmer**: field mapping, crop scanner workflows, yield/risk analytics, irrigation and input logs, and labor/task tracking.
- **Nursery Operator**: inventory batches, health screening, quality grading, orders/dispatch, certificates, and loss/turnover reporting.

---

## Core Features

| Area               | What it does                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI diagnosis       | Uses Google Gemini vision models to analyze plant/crop images and return structured diagnosis, severity, symptoms, scouting notes, recommended actions, and treatment steps. |
| Plant management   | Tracks plants, crop profiles, photos, scan history, notes, care reminders, health status, and treatment completion.                                                          |
| Farmer operations  | Provides field map workflows, crop scanner, yield/risk dashboards, irrigation/input logs, equipment/supplier/expense support, and task management.                           |
| Nursery operations | Manages propagation batches, batch health screening, grading, inventory status, customer orders, dispatch workflows, certificates, and operational reports.                  |
| Community          | Lets users create posts and comments for shared agricultural questions and observations.                                                                                     |
| Notifications      | Records important events such as scans, treatment updates, reminders, and operational changes.                                                                               |
| Exporting          | Exports farm data as CSV, Excel, or PDF reports.                                                                                                                             |
| Billing            | Uses Stripe Checkout, Billing Portal, and webhooks to manage Free, Pro, and Enterprise plans safely server-side.                                                             |
| Auth               | Uses Supabase Auth with email OTP verification and password reset flows.                                                                                                     |

---

## Roles

### Home Gardener

Navigation:

- My Garden
- My Plants
- Plant Doctor
- Care Plans
- Community
- Settings

Best for personal gardens, houseplants, and small collections where the main workflow is scanning plants, tracking treatments, and managing reminders.

### Commercial Farmer

Navigation:

- Farm Overview
- Field Map
- Crop Scanner
- Yield & Risk Analytics
- Irrigation & Inputs
- Labor/Tasks
- Community
- Settings

Best for field-level crop operations, repeat scouting, irrigation records, risk analytics, and work coordination.

### Nursery Operator

Navigation:

- Inventory Overview
- Batches
- Health Screening
- Quality Grading
- Orders & Dispatch
- Loss & Turnover Reports
- Community
- Settings

Best for nursery inventory, propagation batches, quality grading, stock readiness, orders, dispatch, and certificates.

---

## Subscription Plans

| Plan       |      Price | AI scan quota     | Model chain                                      |
| ---------- | ---------: | ----------------- | ------------------------------------------------ |
| Free       |         $0 | 5 scans per month | Lightweight Gemini models                        |
| Pro        |  $29/month | Unlimited scans   | Higher quality Gemini flash chain                |
| Enterprise | $149/month | Unlimited scans   | Enterprise model chain with additional fallbacks |

Plan upgrades are handled by Stripe Checkout. Paid access is granted only after Stripe webhook synchronization updates the subscription and profile records.

---

## Tech Stack

| Layer             | Technology                                     |
| ----------------- | ---------------------------------------------- |
| App framework     | Next.js 15 App Router                          |
| UI                | React 19, Tailwind CSS 4, Motion, Lucide icons |
| Auth and database | Supabase Auth, PostgreSQL, Row Level Security  |
| AI                | Google Gemini via `@google/genai`              |
| Billing           | Stripe Checkout, Billing Portal, Webhooks      |
| Maps and charts   | Leaflet, React Leaflet, Recharts               |
| Reports           | CSV, ExcelJS, jsPDF                            |
| Email             | Nodemailer / SMTP                              |

---

## Project Structure

```text
app/
  api/                 Next.js API routes for auth, billing, scans, exports, and resources
  dashboard/           Main authenticated workspace
  register/            Signup and email verification flow
  login/               Login flow
  Settings/            Route alias for the settings workspace tab

components/
  dashboard/           Role-specific dashboard sections and shared shell
  ui/                  Shared UI primitives
  auth-context.tsx     Client auth, app state, and billing helpers

services/
  auth/                Registration, session, onboarding, and password reset logic
  export/              CSV, Excel, PDF export builders
  *-service.ts         Domain services for scans, farms, nursery, farmer ops, billing, etc.

lib/
  auth.ts              Server session user resolver
  stripe.ts            Server-only Stripe client
  supabase.ts          Shared Supabase helpers

utils/supabase/
  client.ts            Browser Supabase client
  server.ts            Server Supabase client
  middleware.ts        Session middleware helpers
```

---

## Environment Variables

Create `.env.local` from `.env.example` and fill in the required values.

```bash
cp .env.example .env.local
```

Required for core app behavior:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
PENDING_SIGNUP_SECRET=
APP_URL=
```

Required for billing:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_ENTERPRISE=
```

Required for email OTP and password reset delivery:

```env
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Optional:

```env
GEMINI_MODEL=
```

---

## Database Setup

Run the SQL files in Supabase SQL Editor. For a fresh setup, use this order:

1. `supabase_schema.sql`
2. `supabase_rls_patch.sql`
3. `supabase_role_features_patch.sql`
4. `supabase_new_roles_patch.sql`
5. `supabase_remove_agribusiness_role_patch.sql`
6. `supabase_billing_patch.sql`
7. `supabase_service_role_grant_fix.sql`

The `supabase_remove_agribusiness_role_patch.sql` migration is important for the current three-role model.

---

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Type-check:

```bash
npx tsc --noEmit
```

Build:

```bash
pnpm build
```

Note: this project uses `output: 'standalone'` in `next.config.ts`. On some Windows environments, the final standalone tracing step can fail if symlink creation is restricted, even after TypeScript and page generation succeed.

---

## Stripe Billing Flow

The billing flow is intentionally server-controlled:

1. The client requests `/api/billing/checkout` with the selected paid plan.
2. The server validates the authenticated user and selected plan.
3. Stripe Checkout is created with the current app origin for success/cancel URLs.
4. The user completes payment on Stripe.
5. Stripe sends webhook events to `/api/billing/webhook`.
6. The webhook synchronizes `subscriptions` and the cached `profiles.plan`.

The client never grants itself a paid plan. Pro and Enterprise are applied only after Stripe webhook verification.

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

- The app supports three operation types only: `Gardener`, `Farmer`, and `Nursery`.
- Free users receive 5 AI analyses per month.
- Pro and Enterprise users have unlimited AI analyses.
- Export formats are CSV, Excel, and PDF.
- Billing, plan changes, and subscription status are managed through Stripe-hosted pages and webhooks.
