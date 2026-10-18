# StudyBuddyAI

A voice agent that counsels prospective overseas students, qualifies them as leads, and hands the good ones to a human counsellor.

Students talk to an avatar-backed agent in English, Hindi or Marathi. While they talk, the agent builds a structured profile, answers questions from a knowledge base, and scores the lead. Counsellors see conversations live, step in when needed, and get a report when the call ends.

## How it works

```
Browser (Next.js) ── token ──▶ LiveKit room ◀── dispatch ── Python agent
                                                              │
                              Deepgram STT → GPT-4o → TTS, Anam avatar
                                                              │
                              Supabase (Postgres + pgvector) ◀┘
                                                              │
                              call-ended webhook → report, WhatsApp, Slack, Cal.com
```

- **Agent** (`agent/`): LiveKit Agents worker. Extracts the student profile, retrieves from the knowledge base, scores the lead.
- **Web** (`src/`): Next.js App Router. Landing page, live agent session, counsellor dashboard, admin panel.
- **Data** (`supabase/`): Postgres with pgvector for retrieval. Row-level security per role.
- **After the call**: a summary, a lead score, a WhatsApp follow-up, a Slack alert for hot leads, and a booking link.

## Run it

Requires [Bun](https://bun.sh), Python 3.10+ with [uv](https://docs.astral.sh/uv/), and a Supabase project.

```bash
# web
bun install
bun dev

# agent
cd agent
uv sync
uv run agent.py dev
```

Apply the migrations in `supabase/migrations/` (`supabase db push`), then add the keys below.

## Configuration

Web, in `.env.local`:

```
NEXT_PUBLIC_LIVEKIT_URL  LIVEKIT_URL  LIVEKIT_API_KEY  LIVEKIT_API_SECRET
NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY  WEBHOOK_SECRET
CAL_API_KEY  CAL_BOOKING_URL  SLACK_WEBHOOK_URL  RESEND_API_KEY  RESEND_FROM_EMAIL
```

Agent, in `agent/.env.local`:

```
LIVEKIT_URL  LIVEKIT_API_KEY  LIVEKIT_API_SECRET
OPENAI_API_KEY  DEEPGRAM_API_KEY  ANAM_AVATAR_ID
SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY  NEXTJS_API_URL  WEBHOOK_SECRET
TWILIO_ACCOUNT_SID  TWILIO_AUTH_TOKEN  TWILIO_WHATSAPP_FROM
```

## Roles

| Role | Can |
|---|---|
| Student | Talk to the agent, read their summary, book a call |
| Counsellor | Review leads and transcripts, join live conversations, manage appointments |
| Admin | Manage the knowledge base, counsellors, outbound calls and settings |

## Stack

Next.js 16, React 19, Tailwind 4, shadcn/ui, Supabase, LiveKit Agents, OpenAI, Deepgram, Anam, Twilio, Cal.com, Biome.

See [Design.md](Design.md) for the UI conventions and [AGENTS.md](AGENTS.md) for contributor rules.
