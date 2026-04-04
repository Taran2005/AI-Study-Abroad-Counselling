# Project Implementation Phases

This document tracks the different phases of the project, including past feature additions, the current state, and future steps for maintaining and evolving the StudyBuddyAI AI Voice Agent.

## Phase 1: Core Architecture (Completed)
- Integrated Deepgram Nova-3 for quick and accurate real-time STT.
- Integrated OpenAI GPT-4o (`livekit-plugins-openai`) as the core LLM driver.
- Set up LiveKit Room IO to handle WebSocket connections and track subscriptions.

## Phase 2: User Interface & Video (Completed)
- Designed a cohesive web UI mapping STT transcripts and LLM responses into a unified timeline.
- Integrated the Anam Avatar plugin (`livekit-plugins-anam`) to present a lifelike video representation.
- Added camera and screen-sharing controls on the frontend.
- Implemented real-time vision frame processing in `agent.py`, allowing GPT-4o to "see" User Camera and Screen Share tracks.

## Phase 3: Expressive Speech Integration (Completed)
- Swapped Cartesia Cloud Inference for a local `livekit-plugins-elevenlabs` integration.
- Changed TTS engine to `elevenlabs/eleven_multilingual_v2`.
- Updated the OpenAI system prompt instructions to dynamically inject ElevenLabs Audio Tags.

## Phase 4: StudyBuddyAI Rebrand & RAG Pipeline (Completed)
- **Goal:** Transform Luna AI (ReeLabs stem cell company) into StudyBuddyAI (overseas education counsellor) with dynamic RAG.
- **Completed:**
  1. Renamed agent class from `LunaAssistant` to `StudyBuddyAIAssistant`.
  2. Wrote a comprehensive StudyBuddyAI counsellor system prompt with 12+ data extraction guidelines.
  3. Rewrote `knowledge_base.txt` with UK/Ireland university data, IELTS/PTE info, visa guidance, scholarships, and FAQs.
  4. Built Next.js RAG pipeline:
     - `src/lib/supabase.ts` — Server-side Supabase client.
     - `src/lib/embeddings.ts` — OpenAI embedding generation + text chunking.
     - `POST /api/knowledge/upload` — Upload, chunk, embed, and store documents.
     - `GET /api/knowledge` — List stored knowledge documents.
     - `DELETE /api/knowledge/[id]` — Remove documents and their chunks.
     - `POST /api/knowledge/query` — Vector similarity search via Supabase RPC.
  5. Supabase migration: `001_knowledge_tables.sql` (pgvector tables + RPC function).
  6. Modified `agent.py` to query the RAG endpoint on each user turn via `httpx`.
  7. Updated email template from ReeLabs to StudyBuddyAI branding.
  8. Added `httpx` dependency to `pyproject.toml`.

## Phase 5: Database Schema & API Layer (Completed)
- **Goal:** Create the full Supabase database schema and Next.js API routes for all core data.
- **Completed:**
  1. Supabase migration: `002_core_tables.sql` with:
     - `users` table (role enum: student/counsellor/admin)
     - `student_profiles` table (12+ extracted data points)
     - `conversations` table (JSONB transcript + sentiment log)
     - `lead_scores` table (weighted scoring with generated `total_score` column)
     - `university_profiles` table (pgvector embeddings for matching)
     - `appointments` table
     - Comprehensive RLS policies for all three roles
     - Auto-update `updated_at` triggers
     - `match_universities` RPC function for profile-to-university matching
  2. TypeScript types: `src/lib/types/database.ts` (all table types + insert helpers).
  3. API Routes:
     - `POST/GET /api/conversations` — Create + list conversations
     - `GET/PATCH /api/conversations/[id]` — View + update single conversation
     - `POST/GET /api/leads` — Create + list lead scores
     - `GET /api/leads/stats` — Dashboard aggregate statistics
     - `POST/GET /api/students` — Create + list student profiles
     - `GET/PATCH /api/students/[id]` — View + update single student

## Phase 6: Data Extraction & Lead Scoring (Upcoming)
- **Goal:** Extract 12+ data points from student conversations and calculate lead scores.
- **Data Points to Extract:**
  - Personal: Name, phone, email, location
  - Academic: Education level, field, institution, GPA
  - Preferences: Target countries, course interest, intake timing
  - Test Status: IELTS/TOEFL score or preparation stage
  - Financial: Budget range, scholarship interest
  - Timeline: Application deadline
- **Lead Scoring Algorithm:**
  - Intent Seriousness (40%): Goals clarity, research level
  - Financial Readiness (30%): Budget alignment, funding awareness
  - Timeline Urgency (30%): Application deadlines, test prep status
  - Classifications: Hot (70-100), Warm (40-69), Cold (0-39)

## Phase 7: Dashboard UI & Summary Pages (Upcoming)
- Post-call summary page (`/summary/[sessionId]`)
- Counsellor dashboard (`/dashboard`) with lead overview and filters
- Admin knowledge base management (`/admin/knowledge`)

## Phase 8: Multilingual Support Enhancement (Upcoming)
- Add Marathi language support to STT/TTS.
- Verify Hindi/English code-switching works correctly.
- Test with thick Indian accents.

## Phase 9: Premium Features (Future)
- **Tier 1:** Sentiment detection, smart follow-ups
- **Tier 2:** University recommendations, WhatsApp integration, live dashboard
- **Tier 3:** Appointment booking with calendar integration, call analytics dashboard
