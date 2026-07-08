<div align="center">

# 🌿 AgriScan AI

**AI-Powered Plant Disease Detection & Farm Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-blue?style=flat-square&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Deployed on Netlify](https://img.shields.io/badge/Deployed%20on-Netlify-00C7B7?style=flat-square&logo=netlify)](https://agriscana.netlify.app/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<h4>
  <a href="https://agriscana.netlify.app/">🌐 Live Application Demo</a>
</h4>

</div>

---

## 📌 Overview

**AgriScan AI** is a full-stack web application that leverages **Google Gemini's multimodal vision AI** to instantly diagnose plant diseases from photos. It provides a complete environment for managing farms, tracking crop health, and receiving AI-generated treatment plans — eliminating the need to wait for a lab or hire an agronomist.

> [!TIP]
> **Live Demo:** You can access the deployed application live at **[agriscana.netlify.app](https://agriscana.netlify.app/)**.

> 📸 Photograph the diseased leaf → 🤖 Gemini analyzes it → 💊 Get an instant treatment plan

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔬 **AI Scan Lab** | Analyze plant images via live camera or file upload — powered by Gemini Vision |
| 🌱 **Plant Management** | Add and track plants across multiple farms with per-plant observation notes |
| 🏥 **Treatment Plans** | AI-generated detailed treatment recommendations with completion tracking |
| 🌦️ **Weather Alerts** | Localized weather data per farm correlated with disease-risk profiles |
| 👨‍🔬 **Expert Review** | Escalate a scan to an AI plant pathologist for a second opinion |
| 👥 **Community Forum** | Forum for farmers to share knowledge, tips, and experiences |
| 📊 **Report Export** | Download farm data as CSV for offline analysis |
| 🔔 **Notifications** | Real-time alerts for plant health events and treatment updates |

---

## 🛠️ Tech Stack

```
AgriScan AI
├── Frontend
│   ├── Next.js 15 (App Router)
│   ├── TypeScript
│   ├── Tailwind CSS
│   └── Framer Motion + Lucide Icons
│
├── AI Engine
│   └── Google Gemini (Multimodal Vision API)
│
├── Backend & Database
│   ├── Next.js API Routes (Server-side)
│   └── Supabase (PostgreSQL + Row Level Security)
│
└── Auth
    └── Supabase Auth
```

---

## 👤 Target Users

- 🌸 **Home Gardeners** — Diagnose houseplants and backyard garden plants
- 🚜 **Commercial Farmers** — Monitor crop health at scale across large fields
- 🌲 **Nursery Operators** — Track and manage plant inventory health
- 🏢 **Agribusinesses** — Enterprise-level multi-farm analytics and reporting

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Gemini API key

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Fill in your Supabase and Gemini keys in .env.local

# 3. Apply the database schema
# Run supabase_schema.sql in your Supabase SQL Editor

# 4. Start the development server
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## ⚙️ Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📦 Subscription Plans

| Plan | Monthly Scans | Highlights |
|---|---|---|
| **Free** | 5 | Core features |
| **Pro** | Unlimited | + Advanced reports + Priority support |
| **Enterprise** | Unlimited | + Multi-farm management + Custom API access |

