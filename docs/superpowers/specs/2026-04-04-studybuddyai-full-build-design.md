# StudyBuddyAI Full Build — Design Spec
**Date:** 2026-04-04  
**Status:** Approved

---

## What We're Building

StudyBuddyAI is an AI-powered study abroad counselling platform. A voice agent (LiveKit + Python) conducts natural conversations with prospective students, extracts structured profile data, scores leads, and feeds a counsellor dashboard + admin panel.

The landing page and agent UI are already built. This spec covers everything else.

---

## Already Done (Skip)

- `/` — landing page
- `/agent` — LiveKit voice/chat/camera/screen share UI
- `/api/token` — token generation + agent dispatch
- Design system (teal/emerald tokens, shadcn primitives, Design.md)
- `src/lib/utils.ts`

---

## Architecture Overview

```
Browser (Next.js 16 App Router)
  ├── Student pages     /login, /agent (existing), /summary/[id], /book/[id]
  ├── Counsellor        /dashboard/**
  ├── Admin             /admin/**
  └── API routes        /api/token, /api/session/[id], /api/webhook/livekit

Python Agent (LiveKit Agents SDK)
  ├── StudyBuddyAI persona  study abroad counsellor
  ├── Data extraction   12+ fields via function_tool
  ├── Lead scoring      post-call, saved to Supabase
  └── RAG               pgvector retrieval from knowledge_docs table

Supabase
  ├── Auth              passwordless OTP/magic-link (students), email+pass (staff)
  ├── Postgres          full schema (see below)
  ├── pgvector          knowledge base embeddings
  ├── RLS               role-enforced row access
  └── Realtime          live dashboard updates

External
  ├── Twilio WhatsApp   post-call summary + recommendations
  ├── Cal.com           appointment booking embed
  └── OpenAI Embeddings for pgvector ingestion
```

---

## Phase 1: Agent Rewrite

### What changes in agent.py
- Class renamed `StudyBuddyAIAgent` (was `LunaAssistant`)
- Agent name: `studybuddyai-agent` (already matches dispatch in `/api/token`)
- Remove all ReeLabs/stem-cell references
- New system prompt: study abroad counsellor for UK & Ireland universities
- Language mirroring: English / Hindi / Hinglish (keep existing Deepgram + ElevenLabs setup)

### System Prompt Behaviour
- Warm, professional tone; avoids jargon
- Collects 12 data points naturally over conversation (not as a form)
- Uses RAG knowledge base for university/course/visa questions
- Offers to book appointment with counsellor at end of call
- Adapts to student's language (English / Hindi / Hinglish)

### 12 Extracted Data Fields (via function_tool)
```python
extract_student_profile(
  name: str,
  email: str,
  phone: str,
  education_level: str,        # Bachelor's/Master's/PhD
  field_of_study: str,
  target_countries: list[str], # UK, Ireland, etc.
  preferred_courses: list[str],
  ielts_score: float | None,
  pte_score: float | None,
  budget_gbp: int | None,      # annual, in GBP
  scholarship_interest: bool,
  timeline_months: int,        # months until intended start
)
```

### Lead Scoring (post-call function_tool)
```
score = intent(40%) + financial(30%) + timeline(30%)
- intent:    derived from engagement, questions asked, appointment booked
- financial: budget declared, scholarship_interest
- timeline:  timeline_months (sooner = higher score)
tier: hot (70-100), warm (40-69), cold (0-39)
```

### Knowledge Base (knowledge_base.txt replacement)
Study abroad content: UK/Ireland universities, entry requirements, IELTS/PTE benchmarks, visa process, scholarship types, costs of living, popular courses.

---

## Phase 2: Supabase Backend

### Database Schema

```sql
-- Auth managed by Supabase Auth (students = passwordless, staff = email+pass)

students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users,
  name text,
  email text UNIQUE,
  phone text,
  created_at timestamptz DEFAULT now()
)

sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students,
  livekit_room text,
  started_at timestamptz,
  ended_at timestamptz,
  status text DEFAULT 'active'  -- active | completed | abandoned
)

student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  student_id uuid REFERENCES students,
  education_level text,
  field_of_study text,
  target_countries text[],
  preferred_courses text[],
  ielts_score numeric,
  pte_score numeric,
  budget_gbp int,
  scholarship_interest boolean,
  timeline_months int,
  extracted_at timestamptz DEFAULT now()
)

transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  role text,           -- user | agent
  content text,
  timestamp timestamptz DEFAULT now()
)

lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  student_id uuid REFERENCES students,
  intent_score int,
  financial_score int,
  timeline_score int,
  total_score int,
  tier text,           -- hot | warm | cold
  scored_at timestamptz DEFAULT now()
)

recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  university_name text,
  course text,
  match_reason text,
  rank int
)

knowledge_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text,
  embedding vector(1536),
  category text,       -- university | visa | scholarship | general
  created_at timestamptz DEFAULT now()
)

counsellors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users,
  name text,
  email text UNIQUE,
  cal_username text,   -- for Cal.com booking link
  is_active boolean DEFAULT true
)

appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  student_id uuid REFERENCES students,
  counsellor_id uuid REFERENCES counsellors,
  cal_booking_id text,
  scheduled_at timestamptz,
  status text DEFAULT 'pending'  -- pending | confirmed | cancelled
)
```

### Auth Roles
- `student` — passwordless OTP / magic link; can only read their own data
- `counsellor` — email + password; can read all students, sessions, lead_scores for their assigned leads
- `admin` — email + password; full access

### RLS Summary
- `students`: users see own row; counsellors/admins see all
- `sessions`, `transcripts`, `lead_scores`, `recommendations`: student sees own; counsellor/admin see all
- `knowledge_docs`: admin write; all read
- `counsellors`: admin write; counsellors read own; public read for booking
- `appointments`: student/counsellor see own; admin see all

### Next.js Client Files
```
src/lib/supabase/
  client.ts          # createBrowserClient (for client components)
  server.ts          # createServerClient (for server components + API routes)
  middleware.ts      # session refresh + role-based route protection
```

---

## Phase 3: Post-Call Pipeline

### LiveKit Webhook (`/api/webhook/livekit`)
Triggered when `room_finished` event fires:
1. Find session by `room_name`
2. Mark session `status = completed`, set `ended_at`
3. Call `generate_summary(session_id)` — GPT-4o summarises transcript
4. Trigger Twilio WhatsApp message to student's phone

### Summary Generation
- Pull transcript rows for session
- GPT-4o prompt: extract summary paragraph + top 3 university recommendations
- Store recommendations in `recommendations` table

### Twilio WhatsApp Message
Sent to `student_profiles.phone` after session ends:
```
Hi {name}! 🎓 Here's your StudyBuddyAI session summary:

Your profile: {education_level} in {field_of_study}, targeting {countries} with budget £{budget}/yr

Top university matches:
1. {uni_1} — {course_1}
2. {uni_2} — {course_2}
3. {uni_3} — {course_3}

Book a free counsellor session: {booking_link}
```

---

## Phase 4: Student Pages

### `/login`
- Tabs: "Student" (OTP/magic link) | "Staff" (email + password)
- On success: redirect students to `/` ; staff to `/dashboard`
- Supabase Auth handles token + session

### `/summary/[sessionId]`
- Server component: fetch session, profile, score, recommendations
- Sections: Profile snapshot, Lead score badge (hot/warm/cold), University recommendations, Transcript accordion, Book appointment CTA
- Auth guard: only the student who owns the session (or counsellor/admin)

### `/book/[counsellorId]`
- Fetch counsellor's `cal_username` from DB
- Render Cal.com embed: `https://cal.com/{cal_username}`
- Pass student name/email as prefill query params

---

## Phase 5: Counsellor Dashboard

### `/dashboard` — Overview
- Stats cards: today's hot/warm/cold counts, total calls, avg score
- Recent leads table (last 5, link to detail)
- Supabase Realtime subscription on `sessions` table

### `/dashboard/leads` — Lead List
- Filterable table: tier badge, student name, score, date, status
- Search by name/email
- Sortable columns
- Paginated (20/page)

### `/dashboard/leads/[id]` — Student Detail
- Full profile (all 12 extracted fields)
- Score breakdown (intent / financial / timeline bars)
- University recommendations
- Conversation transcript (expandable)
- Actions: "Mark as contacted", "Book appointment" button

### `/dashboard/appointments` — Appointments
- Calendar view (weekly) + list view toggle
- Upcoming bookings with student name, time, status

### `/dashboard/conversations` — Live Conversations
- Realtime subscription on `sessions WHERE status = 'active'`
- List of active calls with student name, duration, live status
- Click to view partial transcript (Realtime on `transcripts` table)

---

## Phase 6: Admin Panel

### `/admin` — Analytics Dashboard
- Charts (Recharts): call volume (7-day line), score distribution (pie), avg score trend
- KPI cards: total leads, conversion rate (booked/total), avg score

### `/admin/knowledge` — Knowledge Base
- Table of `knowledge_docs` with title, category, date
- Upload: textarea or file upload → chunk → embed via OpenAI → insert to pgvector
- Delete/edit entries

### `/admin/counsellors` — Counsellor Management
- List counsellors with active toggle
- Create new counsellor (triggers Supabase auth invite email)
- Edit Cal.com username

### `/admin/settings` — System Config
- Scoring weights (intent/financial/timeline) — stored in a `config` table
- Notification rules toggle (WhatsApp on/off)

---

## Phase 7: RAG

### Ingestion (admin upload → pgvector)
- Chunk documents: ~500 tokens with 50-token overlap
- Embed each chunk with `text-embedding-3-small`
- Store in `knowledge_docs` with `embedding vector(1536)`

### Retrieval (in agent during conversation)
- `retrieve_knowledge(query: str)` function_tool on the agent
- Cosine similarity search: `SELECT content FROM knowledge_docs ORDER BY embedding <=> $query_embedding LIMIT 3`
- Injected as context into the agent's next LLM turn

---

## File Structure (new files)

```
src/
  app/
    login/page.tsx
    summary/[sessionId]/page.tsx
    book/[counsellorId]/page.tsx
    dashboard/
      page.tsx
      leads/page.tsx
      leads/[id]/page.tsx
      appointments/page.tsx
      conversations/page.tsx
    admin/
      page.tsx
      knowledge/page.tsx
      counsellors/page.tsx
      settings/page.tsx
    api/
      webhook/livekit/route.ts
      session/[id]/route.ts
  components/
    dashboard/
      stats-card.tsx
      lead-table.tsx
      score-badge.tsx
      transcript-view.tsx
    admin/
      knowledge-upload.tsx
      analytics-charts.tsx
  lib/
    supabase/
      client.ts
      server.ts
    scoring.ts          # lead score calculation
    summary.ts          # GPT-4o summary generation
    whatsapp.ts         # Twilio WhatsApp sender
  middleware.ts         # route protection

agent/
  agent.py              # full rewrite
  knowledge_base.txt    # full replacement
```

---

## Environment Variables Needed

```env
# Already in use
NEXT_PUBLIC_LIVEKIT_URL=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
OPENAI_API_KEY=

# New — Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# New — Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=   # e.g. whatsapp:+14155238886

# New — LiveKit webhook signing
LIVEKIT_WEBHOOK_SECRET=

# Agent (Python .env.local)
OPENAI_API_KEY=         # already set
ELEVENLABS_VOICE_ID=    # already set
ANAM_AVATAR_ID=         # already set
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Build Order

1. Agent rewrite (agent.py + knowledge_base.txt)
2. Supabase schema + client lib + middleware
3. Post-call pipeline (webhook + summary + WhatsApp)
4. Student pages (/login, /summary, /book)
5. Counsellor dashboard (/dashboard/*)
6. Admin panel (/admin/*)
7. RAG (pgvector ingestion + retrieval)
