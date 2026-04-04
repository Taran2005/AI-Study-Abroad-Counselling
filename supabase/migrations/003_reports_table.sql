-- ============================================================
-- StudyBuddyAI Reports Table
-- ============================================================
-- Stores post-call reports with all sections

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  student_name TEXT,
  
  -- Report sections (all JSONB for flexibility)
  profile_summary JSONB DEFAULT '{}'::jsonb,
  university_recommendations JSONB DEFAULT '[]'::jsonb,
  gap_analysis JSONB DEFAULT '{}'::jsonb,
  personalized_timeline JSONB DEFAULT '[]'::jsonb,
  conversation_highlights JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  
  -- Lead score snapshot
  lead_score_snapshot JSONB DEFAULT '{}'::jsonb,
  sentiment_journey JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_conversation ON public.reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reports"
  ON public.reports FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on reports"
  ON public.reports FOR ALL
  USING (true)
  WITH CHECK (true);
