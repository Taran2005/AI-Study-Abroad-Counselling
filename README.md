# StudyBuddyAI

### AI-Powered Study Abroad Counselling Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![LiveKit](https://img.shields.io/badge/LiveKit-Agents-FF4A00?style=for-the-badge&logo=livekit&logoColor=white)](https://livekit.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**StudyBuddyAI** is an AI-powered voice counselling platform for overseas education consultancies.  
It conducts natural, multilingual conversations with prospective students, extracts structured profiles,  
scores leads intelligently, and surfaces actionable insights on a real-time counsellor dashboard.

[🚀 Live Demo](#) · [📖 Docs](#architecture) · [🐛 Report Bug](issues) · [✨ Request Feature](issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [User Roles](#-user-roles)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 🌍 Overview

Traditional phone-based counselling systems suffer from limited availability, inconsistent data collection, and inefficient lead qualification. StudyBuddyAI solves this with a full AI-first pipeline:

| Problem | StudyBuddyAI Solution |
|---|---|
| 30–40% student drop-off during peak seasons | 24/7 AI voice agent — zero wait time |
| Manual note-taking → incomplete profiles | Automated extraction of 12+ structured data points |
| Counsellors waste time on unqualified leads | AI lead scoring: Hot / Warm / Cold classification |
| 60–70% of time on repetitive FAQs | RAG-powered knowledge base answers questions during the call |
| No follow-up consistency | Automated WhatsApp summaries + appointment booking post-call |

Built for consultancies like **Fateh Education** (45,000+ successful placements), specialising in UK & Ireland university placements.

---

## ✨ Features

### 🎙️ Intelligent Voice Agent
- Natural conversations in **English, Hindi & Marathi** with Hinglish code-switching support
- Real-time AI avatar (Anam AI) synced to speech for a face-to-face experience
- **< 3 second latency** end-to-end (Deepgram STT → GPT-4o → ElevenLabs TTS)
- Sentiment-aware tone adaptation per conversation turn
- Camera & screen share support for document review during calls

### 🧠 Smart Data Extraction
Extracts **12+ structured data points** naturally during conversation — no forms, no friction:

| Category | Fields |
|---|---|
| Personal | Name, Phone, Email, Location |
| Academic | Education Level, Field of Study, Institution, GPA |
| Preferences | Target Countries, Course Interest, Intake Timing |
| Test Status | IELTS / PTE Score or Preparation Stage |
| Financial | Budget Range, Scholarship Interest |
| Timeline | Application Deadline, Start Date |

### 📊 Lead Qualification Scoring
Automatic post-call scoring and tiering:

```
Score = Intent (40%) + Financial Readiness (30%) + Timeline Urgency (30%)

🔴 Hot   (70–100) → Immediate callback
🟡 Warm  (40–69)  → Follow-up within 24 hours
🔵 Cold  (0–39)   → Nurture campaign
```

### 🔍 RAG Knowledge Base
- Chunked document ingestion (OpenAI `text-embedding-3-small` → Supabase pgvector)
- Cosine similarity retrieval during live calls
- Admin-managed: upload PDFs, edit entries, delete chunks
- Covers UK/Ireland universities, IELTS/PTE requirements, visa processes, scholarships

### 📱 Post-Call Automation
- WhatsApp summary message sent automatically via Twilio
- Personalized university recommendations (top 3)
- PDF Study Plan generation
- Slack / Email alerts for hot leads (score > 70)

### 📅 Appointment Booking
- Cal.com embed with counsellor availability
- Student name + email pre-filled from extracted profile
- Booking confirmed to both student (WhatsApp) and counsellor (Slack/email)

### 📈 Real-Time Dashboards
- **Counsellor Dashboard** — live lead feed, full transcript + score breakdown, appointment management
- **Admin Panel** — analytics (Recharts), knowledge base management, counsellor accounts, scoring config

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| **Voice Agent** | LiveKit Agents SDK (Python), OpenAI GPT-4o, Deepgram Nova-3 (STT), ElevenLabs (TTS) |
| **Avatar** | Anam AI SDK — lifelike video avatar synced to agent speech |
| **Database** | Supabase — Postgres + pgvector + Auth + Realtime |
| **RAG** | OpenAI Embeddings → Supabase pgvector (chunked knowledge docs) |
| **Messaging** | Twilio WhatsApp API |
| **Scheduling** | Cal.com API + Google Calendar |
| **Analytics** | Recharts |
| **Agent Containerization** | Docker + Railway / Fly.io |
| **Frontend Deploy** | Vercel |
| **Language** | TypeScript (Next.js) + Python (Agent) |
| **Linting / Format** | Biome |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Browser (Next.js App Router)                │
│                                                             │
│   / (landing)   /talk (agent UI)   /summary/[id]           │
│   /login        /book/[id]                                  │
│   /dashboard/** (counsellor)   /admin/** (admin)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              LiveKit Cloud (Room Orchestration)              │
│                                                             │
│   /api/token ──► dispatches ──► Python Agent Worker        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  StudyBuddyAI Python Agent                       │
│                                                             │
│   Deepgram Nova-3 (STT) → GPT-4o (LLM) → ElevenLabs (TTS) │
│   ├── extract_student_profile()   (function_tool)           │
│   ├── score_lead()                (function_tool)           │
│   └── retrieve_knowledge()        (RAG → pgvector)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase (Database + Auth)                     │
│                                                             │
│   students · sessions · student_profiles · transcripts      │
│   lead_scores · recommendations · knowledge_docs            │
│   counsellors · appointments                                │
│                                                             │
│   Auth: Passwordless OTP (students) / Email+Pass (staff)   │
│   RLS: Role-enforced row access                             │
│   Realtime: Live dashboard subscriptions                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Post-call webhook
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Post-Call Pipeline                          │
│                                                             │
│   /api/webhook/livekit (room_finished event)                │
│   ├── GPT-4o transcript summary                             │
│   ├── Twilio WhatsApp message                               │
│   ├── Slack hot-lead alert                                  │
│   └── Cal.com booking link dispatch                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- [Python 3.10+](https://python.org) with `uv` or `pip`
- [Supabase](https://supabase.com) project
- API keys: LiveKit, OpenAI, ElevenLabs, Deepgram, Anam AI, Twilio

---

### 1. Clone the Repository

```bash
git clone https://github.com/Taran2005/AI-Study-Abroad-Counselling.git
cd studybuddyai
```

### 2. Web Application

```bash
# Install dependencies
bun install

# Set up environment variables (see Environment Variables section)
# Then start the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Python Voice Agent

```bash
cd agent

# Create a virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt
# or using uv:
uv sync

# Configure agent environment variables
# (copy .env.local.example → .env.local and fill in values)

# Start the agent worker
python agent.py dev
```

### 4. Supabase Migrations

Run the SQL migrations inside `supabase/` against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually apply:
# supabase/migrations/001_knowledge_tables.sql
# supabase/migrations/002_core_tables.sql
```

---

## 📁 Project Structure

```
studybuddyai/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/page.tsx            # Auth (student OTP / staff login)
│   │   ├── talk/page.tsx             # Voice agent UI + Anam avatar
│   │   ├── summary/[sessionId]/      # Post-call summary
│   │   ├── book/[counsellorId]/      # Cal.com appointment booking
│   │   ├── dashboard/                # Counsellor dashboard
│   │   │   ├── page.tsx
│   │   │   ├── leads/
│   │   │   ├── appointments/
│   │   │   └── conversations/
│   │   ├── admin/                    # Admin panel
│   │   │   ├── page.tsx
│   │   │   ├── knowledge/
│   │   │   ├── counsellors/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── token/route.ts        # LiveKit token + agent dispatch
│   │       ├── webhook/livekit/      # Post-call pipeline trigger
│   │       ├── conversations/
│   │       ├── leads/
│   │       └── knowledge/
│   ├── components/
│   │   ├── dashboard/
│   │   └── admin/
│   └── lib/
│       ├── supabase/                 # Browser + server clients
│       ├── types/database.ts
│       ├── scoring.ts                # Lead scoring logic
│       ├── summary.ts                # GPT-4o summary generation
│       └── whatsapp.ts               # Twilio WhatsApp sender
│
├── agent/
│   ├── agent.py                      # StudyBuddyAI voice agent (LiveKit)
│   ├── data_pipeline.py              # Post-call data extraction
│   ├── twilio_client.py              # WhatsApp messaging
│   ├── knowledge_base.txt            # UK/Ireland counselling content
│   ├── pyproject.toml
│   └── Dockerfile
│
├── supabase/
│   └── migrations/
│
├── docs/
│   └── superpowers/specs/
│
├── Design.md                         # Design system & UI consistency guide
├── implementation.md                 # Phase-by-phase implementation log
├── FEATURES-TODO.md                  # Upcoming feature backlog
└── AGENTS.md                         # AI coding agent rules
```

---

## 👥 User Roles

| Role | Access | Auth Method |
|---|---|---|
| **Student** | Voice agent (`/talk`), personal summary, appointment booking | Passwordless — Phone OTP or Email Magic Link |
| **Counsellor** | Lead list and details, transcript viewer, score breakdown, appointments | Email + Password |
| **Admin** | Analytics dashboard, knowledge base management, counsellor accounts, system config | Email + Password |

Row Level Security (RLS) is enforced across all Supabase tables — users can only access data they are authorized to see.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# ── LiveKit ──────────────────────────────────────
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_WEBHOOK_SECRET=

# ── OpenAI ───────────────────────────────────────
OPENAI_API_KEY=

# ── Supabase ─────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Twilio (WhatsApp) ────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

For the **Python agent**, create `agent/.env.local`:

```env
OPENAI_API_KEY=
ELEVENLABS_VOICE_ID=
DEEPGRAM_API_KEY=
ANAM_AVATAR_ID=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please follow the architecture and coding rules defined in [`AGENTS.md`](AGENTS.md) and maintain the UI consistency documented in [`Design.md`](Design.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ for the overseas education industry

**[⬆ Back to top](#-studybuddyai)**

</div>
