-- ============================================================
-- Outbound Calls Table
-- Stores all outbound call data from Bolna AI webhook callbacks
-- ============================================================

-- Helper function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS outbound_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to original inbound conversation (nullable for manual triggers)
    conversation_id UUID REFERENCES conversations(id),

    -- Bolna identifiers
    bolna_execution_id TEXT UNIQUE,
    bolna_agent_id TEXT,

    -- Student info
    student_name TEXT,
    student_phone TEXT NOT NULL,
    student_email TEXT,

    -- Call metadata
    call_type TEXT NOT NULL DEFAULT 'follow_up',      -- follow_up | appointment_confirm | re_engage
    call_status TEXT NOT NULL DEFAULT 'queued',        -- queued | in-progress | completed | failed | no_answer
    call_outcome TEXT,                                 -- interested | callback_requested | not_interested | voicemail | no_answer

    -- Timing
    initiated_at TIMESTAMPTZ DEFAULT now(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_secs INTEGER DEFAULT 0,

    -- Bolna post-call data (populated by webhook)
    transcript TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    call_summary TEXT,
    recording_url TEXT,

    -- Context passed to Bolna via user_data
    user_data JSONB DEFAULT '{}'::jsonb,

    -- Trigger info
    triggered_by TEXT DEFAULT 'system',                -- system | admin

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX idx_outbound_calls_status ON outbound_calls(call_status);
CREATE INDEX idx_outbound_calls_outcome ON outbound_calls(call_outcome);
CREATE INDEX idx_outbound_calls_conversation ON outbound_calls(conversation_id);
CREATE INDEX idx_outbound_calls_bolna ON outbound_calls(bolna_execution_id);
CREATE INDEX idx_outbound_calls_initiated ON outbound_calls(initiated_at DESC);
CREATE INDEX idx_outbound_calls_phone ON outbound_calls(student_phone);

-- ── Auto-update trigger ──
CREATE TRIGGER set_outbound_calls_updated_at
    BEFORE UPDATE ON outbound_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
