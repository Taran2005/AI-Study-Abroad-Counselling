# StudyBuddyAI

AI study abroad advisor — Next.js 16 frontend + Python LiveKit voice agent.

## Commands

```bash
# Frontend
bun dev          # Start Next.js dev server
bun build        # Production build
bun lint         # Biome check (not ESLint)
bun format       # Biome format --write

# Agent (Python)
cd agent
uv run agent.py  # Start LiveKit voice agent
```

## Architecture

```
src/
  app/
    agent/page.tsx        # Agent UI (LiveKit room)
    api/token/route.ts    # LiveKit token endpoint
  components/
    hero/                 # Landing page hero
    ui/                   # shadcn/ui primitives
  lib/utils.ts            # cn() helper
agent/
  agent.py                # Python LiveKit agent
  knowledge_base.txt      # Agent knowledge
  Dockerfile              # Agent container
```

## Gotchas

- Use `bun` not `npm` — project uses bun.lock
- Linter is **Biome**, not ESLint/Prettier — run `bun lint` not `eslint`
- Tailwind v4 (PostCSS plugin, not v3 config style)
- LiveKit token must be fetched from `/api/token` before joining a room
- Agent is a separate process — frontend and agent run independently
