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
- Changed TTS engine to `elevenlabs.TTS(model="eleven_multilingual_v2")`.
- Updated the OpenAI system prompt instructions to dynamically inject ElevenLabs Audio Tags.

## Phase 4: StudyBuddyAI Rebrand (Current - In Progress)
- **Goal:** Transform Luna AI (ReeLabs stem cell company) into StudyBuddyAI (overseas education counsellor).
- **Completed:**
  1. Updated `package.json` name from `luna-ai` to `studybuddyai`.
  2. Rebranded `navbar.tsx` with StudyBuddyAI logo (GraduationCap icon) and education-focused nav links.
  3. Rewrote `hero-section.tsx` with education stats (45K+ students, 120+ universities, UK & Ireland).
  4. Updated `agent/page.tsx` connect screen with StudyBuddyAI branding.
  5. Changed API route to dispatch `studybuddyai-agent` instead of `luna-agent`.
  6. Updated agent registration from `luna-agent` to `studybuddyai-agent`.
  7. Updated `layout.tsx` metadata for SEO (title, description, keywords).
- **Pending Tasks:**
  - Replace `knowledge_base.txt` with UK/Ireland education content.
  - Rewrite agent persona from Luna/ReeLabs to StudyBuddyAI counsellor.
  - Update email templates for StudyBuddyAI branding.

## Phase 5: Data Extraction & Lead Scoring (Upcoming)
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

## Phase 6: Report Generation & UI (Upcoming)
- **Goal:** Generate structured JSON reports and display them in the UI.
- **Report Contents:**
  - Full conversation transcript
  - Extracted student data (JSON)
  - Lead score with breakdown
  - Recommended next actions
- **UI Components:**
  - Post-call summary screen
  - Real-time data extraction status during call
  - Counsellor notes section

## Phase 7: Multilingual Support Enhancement (Upcoming)
- Add Marathi language support to STT/TTS.
- Verify Hindi/English code-switching works correctly.
- Test with thick Indian accents.

## Phase 8: Bonus Features (Future)
- **Tier 1:** Sentiment detection, smart follow-ups, multi-turn memory
- **Tier 2:** University recommendations, WhatsApp integration, live dashboard
- **Tier 3:** Appointment booking with calendar integration, call analytics dashboard
