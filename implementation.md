# Project Implementation Phases

This document tracks the different phases of the project, including past feature additions, the current state, and future steps for maintaining and evolving the Luna AI Voice Agent.

## Phase 1: Core Architecture (Completed)
- Integrated Deepgram Nova-3 for quick and accurate real-time STT.
- Integrated OpenAI GPT-4o (`livekit-plugins-openai`) as the core LLM driver.
- Set up LiveKit Room IO to handle WebSocket connections and track subscriptions.

## Phase 2: User Interface & Video (Completed)
- Designed a cohesive web UI mapping STT transcripts and LLM responses into a unified timeline.
- Integrated the Anam Avatar plugin (`livekit-plugins-anam`) to present a lifelike video representation of Luna.
- Added camera and screen-sharing controls on the frontend.
- Implemented real-time vision frame processing in `agent.py`, allowing GPT-4o to "see" User Camera and Screen Share tracks.

## Phase 3: Expressive Speech Integration (Current)
- **Goal:** Enhance the TTS delivery with lifelike emotion and non-speech sounds (laughs, sighs).
- **Execution:**
  1. Swapped Cartesia Cloud Inference for a local `livekit-plugins-elevenlabs` integration.
  2. Changed TTS engine to `elevenlabs.TTS(model="eleven_multilingual_v2")`.
  3. Updated the OpenAI system prompt instructions to dynamically inject ElevenLabs Audio Tags (e.g., `[laughs]`, `[sighs]`) directly into the dialogue to trigger specific sound effects in the audio stream.
- **Pending Tasks:**
  - Provide API keys in local development environment.
  - Final test to verify lip-syncing aligns with the Audio Tags and non-speech sounds.

## Phase 4: Knowledge Base Integration (Current)
- **Goal:** Transform Luna from a generic assistant into a ReeLabs domain expert.
- **Approach:** System Prompt Injection (chosen over RAG for zero latency in voice pipeline).
- **Execution:**
  1. Scraped 12+ pages from `reelabs.com` (About, Banking, Therapy, Anti-Ageing, Treatable Diseases, etc.).
  2. Condensed all content into `agent/knowledge_base.txt` — a structured document optimized for LLM consumption.
  3. Updated `agent.py` to load `knowledge_base.txt` at startup via `pathlib` and inject it into the system prompt.
  4. Rewrote Luna's persona from "generic AI assistant" to "ReeLabs virtual stem cell consultant."
- **Knowledge Base covers:**
  - Company overview and stats (13 patents, 10 sources, 99% cell recovery rate)
  - All 10 stem cell banking sources with detailed explanations
  - Stem cell therapy for 80+ conditions
  - Golden Vial Anti-Ageing program (protocol, results, FAQs, testimonials)
  - Osteoarthritis treatment and Toticyte product
  - Contact information and service links

## Phase 5: Multilingual Code-Switching (Current)
- **Goal:** Allow the agent to mirror "Hinglish" seamlessly naturally switching between Hindi and English words.
- **Execution:**
  1. Updated `stt` to use an explicit deepgram.STT object with `language="hi"`. Deepgram's Hindi model natively parses thick Indian accents and English loan words efficiently.
  2. Injected a rule into Luna's system prompt instructions: "You must perfectly mirror the user's language and speaking style." If they speak Hinglish, reply in Hinglish.
  3. Changed the `tts` engine from standard Cartesia to `cartesia.TTS(model="sonic-multilingual")` so it correctly pronounces Devanagari script and English interchangeably without mangling phonetic sounds.

## Phase 6: Scheduler & Transcription UI Fix (Current)
- **Goal**: Allow users to verbally book a consultation while receiving real-time transcript updates in the frontend.
- **Frontend Fix (`page.tsx`)**: Removed the `lk.transcription_final` filter loop, allowing interim LLM voice generation blobs to render progressively. 
- **Backend Feature (`agent.py`)**: 
  - Subclassed `llm.FunctionContext` to create the `@llm.ai_callable` `book_consultation` tool.
  - LLM now automatically extracts `user_name`, `user_email`, `date`, and `time` during conversation.
  - Implemented `smtplib` inside the function call to instantly send a cleanly formatted HTML confirmation email using environment credentials (`SENDER_EMAIL` & `SENDER_PASSWORD`).

## Future Phases
- Build "Scan Medical File" UI button for the vision pipeline showcase.
- Implement Function Calling for lead capture (book_consultation tool).
- Add explicit multilingual language-switch UI indicator.
- Address any remaining lint errors or minor connection edge-cases.
- Test and establish mobile responsiveness for the live session UI.
