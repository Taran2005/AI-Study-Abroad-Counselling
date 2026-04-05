-- Add handoff support to conversations table
-- When a student requests a human counsellor, the agent flags the conversation.
-- The dashboard then shows a "Join Call" button for counsellors.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS handoff_requested BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookups of conversations needing a counsellor
CREATE INDEX IF NOT EXISTS idx_conversations_handoff
  ON conversations (handoff_requested)
  WHERE handoff_requested = TRUE AND status = 'live';
