-- ============================================================
-- StudyBuddyAI Core Tables (run this in the Supabase SQL editor)
-- ============================================================
-- Depends on: 001_knowledge_tables.sql (pgvector extension)

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
-- Extends Supabase Auth. This table stores application-level
-- profile data and the role (student / counsellor / admin).
-- The `id` matches auth.users.id so we can join easily.

create type public.user_role as enum ('student', 'counsellor', 'admin');

create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique,
  phone       text,
  full_name   text,
  role        public.user_role not null default 'student',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast role-based queries
create index if not exists users_role_idx on public.users(role);

-- ────────────────────────────────────────────────────────────
-- 2. STUDENT PROFILES
-- ────────────────────────────────────────────────────────────
-- Stores the 12+ extracted data points from AI conversations.
-- One row per student, updated progressively as data is gathered.

create table if not exists public.student_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique references public.users(id) on delete cascade,
  name                 text,
  location             text,
  education_level      text,        -- e.g. '12th', 'UG', 'PG'
  field_of_study       text,
  institution          text,
  gpa                  text,        -- stored as text to handle % and GPA formats
  target_countries     text[],      -- e.g. {'UK', 'Ireland'}
  course_interest      text,
  preferred_intake     text,        -- e.g. 'September 2025', 'January 2026'
  test_type            text,        -- e.g. 'IELTS', 'PTE', 'TOEFL', 'None'
  test_score           text,        -- e.g. '7.0', '65', 'Not taken yet'
  budget_range         text,        -- e.g. '15-20 lakh', '25,000 GBP'
  scholarship_interest boolean default false,
  timeline             text,        -- e.g. 'Applying this year', '6 months out'
  phone                text,
  email                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. CONVERSATIONS
-- ────────────────────────────────────────────────────────────
-- Stores each voice agent session with transcript & sentiment.

create type public.conversation_status as enum ('live', 'completed', 'abandoned');

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references public.users(id) on delete set null,
  room_name       text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_secs   integer,
  status          public.conversation_status not null default 'live',
  transcript      jsonb default '[]'::jsonb,      -- array of {role, text, timestamp}
  sentiment_log   jsonb default '[]'::jsonb,      -- array of {turn, sentiment, confidence}
  extracted_data  jsonb default '{}'::jsonb,       -- structured data extracted during call
  language        text default 'en',               -- detected primary language
  created_at      timestamptz not null default now()
);

create index if not exists conversations_student_idx on public.conversations(student_id);
create index if not exists conversations_status_idx on public.conversations(status);
create index if not exists conversations_created_idx on public.conversations(created_at desc);

-- ────────────────────────────────────────────────────────────
-- 4. LEAD SCORES
-- ────────────────────────────────────────────────────────────
-- Post-call scoring: intent (40%) + financial (30%) + timeline (30%)
-- Classification: Hot (70-100), Warm (40-69), Cold (0-39)

create type public.lead_classification as enum ('hot', 'warm', 'cold');

create table if not exists public.lead_scores (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid unique references public.conversations(id) on delete cascade,
  student_id           uuid references public.users(id) on delete set null,

  -- Individual component scores (0-100)
  intent_score         integer not null default 0 check (intent_score between 0 and 100),
  financial_score      integer not null default 0 check (financial_score between 0 and 100),
  timeline_score       integer not null default 0 check (timeline_score between 0 and 100),

  -- Weighted total: intent(40%) + financial(30%) + timeline(30%)
  total_score          integer generated always as (
    (intent_score * 40 + financial_score * 30 + timeline_score * 30) / 100
  ) stored,

  classification       public.lead_classification not null default 'cold',
  recommended_actions  jsonb default '[]'::jsonb,    -- e.g. ["Call back within 24h", "Send scholarship info"]
  notes                text,
  created_at           timestamptz not null default now()
);

create index if not exists lead_scores_classification_idx on public.lead_scores(classification);
create index if not exists lead_scores_total_idx on public.lead_scores(total_score desc);
create index if not exists lead_scores_student_idx on public.lead_scores(student_id);

-- ────────────────────────────────────────────────────────────
-- 5. UNIVERSITY PROFILES
-- ────────────────────────────────────────────────────────────
-- Structured university data with vector embeddings for
-- matching student profiles to suitable universities.

create table if not exists public.university_profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country       text not null,              -- 'UK' or 'Ireland'
  city          text,
  ranking       integer,                     -- QS/Times ranking
  courses       jsonb default '[]'::jsonb,   -- [{name, level, duration, fees}]
  requirements  jsonb default '{}'::jsonb,   -- {ielts_min, gpa_min, ...}
  costs         jsonb default '{}'::jsonb,   -- {tuition_min, tuition_max, living_annual}
  scholarships  jsonb default '[]'::jsonb,   -- [{name, value, eligibility}]
  website       text,
  embedding     vector(1536),                -- for profile-to-university matching
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists university_country_idx on public.university_profiles(country);

-- Vector index for university matching
create index if not exists university_embedding_idx
  on public.university_profiles
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ────────────────────────────────────────────────────────────
-- 6. APPOINTMENTS
-- ────────────────────────────────────────────────────────────

create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid references public.users(id) on delete set null,
  counsellor_id   uuid references public.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  cal_event_id    text,                          -- external Cal.com event ID
  scheduled_at    timestamptz not null,
  duration_mins   integer default 30,
  status          public.appointment_status not null default 'scheduled',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists appointments_student_idx on public.appointments(student_id);
create index if not exists appointments_counsellor_idx on public.appointments(counsellor_id);
create index if not exists appointments_scheduled_idx on public.appointments(scheduled_at);

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY POLICIES
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.lead_scores enable row level security;
alter table public.university_profiles enable row level security;
alter table public.appointments enable row level security;

-- ── USERS ──
-- Everyone can read their own row
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Counsellors and admins can view all users
create policy "Staff can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('counsellor', 'admin')
    )
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Admins can manage all users
create policy "Admins can manage users"
  on public.users for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Service role bypass (for API routes)
create policy "Service role full access on users"
  on public.users for all
  using (true)
  with check (true);

-- ── STUDENT PROFILES ──
create policy "Students can view own profile"
  on public.student_profiles for select
  using (user_id = auth.uid());

create policy "Students can update own profile"
  on public.student_profiles for update
  using (user_id = auth.uid());

create policy "Staff can view all student profiles"
  on public.student_profiles for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('counsellor', 'admin')
    )
  );

create policy "Service role full access on student_profiles"
  on public.student_profiles for all
  using (true)
  with check (true);

-- ── CONVERSATIONS ──
create policy "Students can view own conversations"
  on public.conversations for select
  using (student_id = auth.uid());

create policy "Staff can view all conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('counsellor', 'admin')
    )
  );

create policy "Service role full access on conversations"
  on public.conversations for all
  using (true)
  with check (true);

-- ── LEAD SCORES ──
create policy "Staff can view lead scores"
  on public.lead_scores for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('counsellor', 'admin')
    )
  );

create policy "Service role full access on lead_scores"
  on public.lead_scores for all
  using (true)
  with check (true);

-- ── UNIVERSITY PROFILES ──
-- Public read access for everyone
create policy "Anyone can view universities"
  on public.university_profiles for select
  using (true);

-- Only admins can modify
create policy "Admins can manage universities"
  on public.university_profiles for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "Service role full access on university_profiles"
  on public.university_profiles for all
  using (true)
  with check (true);

-- ── APPOINTMENTS ──
create policy "Students can view own appointments"
  on public.appointments for select
  using (student_id = auth.uid());

create policy "Counsellors can view assigned appointments"
  on public.appointments for select
  using (counsellor_id = auth.uid());

create policy "Staff can view all appointments"
  on public.appointments for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('counsellor', 'admin')
    )
  );

create policy "Service role full access on appointments"
  on public.appointments for all
  using (true)
  with check (true);

-- ────────────────────────────────────────────────────────────
-- 8. HELPER FUNCTION: auto-update updated_at
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply auto-update triggers
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger set_student_profiles_updated_at
  before update on public.student_profiles
  for each row execute function public.handle_updated_at();

create trigger set_university_profiles_updated_at
  before update on public.university_profiles
  for each row execute function public.handle_updated_at();

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 9. HELPER FUNCTION: Match university profiles to a student query
-- ────────────────────────────────────────────────────────────

create or replace function public.match_universities(
  query_embedding vector(1536),
  match_count int default 3,
  match_threshold float default 0.4
)
returns table (
  id          uuid,
  name        text,
  country     text,
  city        text,
  ranking     integer,
  courses     jsonb,
  requirements jsonb,
  costs       jsonb,
  scholarships jsonb,
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    up.id,
    up.name,
    up.country,
    up.city,
    up.ranking,
    up.courses,
    up.requirements,
    up.costs,
    up.scholarships,
    1 - (up.embedding <=> query_embedding) as similarity
  from public.university_profiles up
  where 1 - (up.embedding <=> query_embedding) > match_threshold
  order by up.embedding <=> query_embedding
  limit match_count;
end;
$$;
