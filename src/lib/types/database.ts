/**
 * TypeScript types mirroring the StudyBuddyAI Supabase schema.
 * Keep in sync with supabase/migrations/002_core_tables.sql
 */

// ── Enums ──

export type UserRole = "student" | "counsellor" | "admin";
export type ConversationStatus = "live" | "completed" | "abandoned";
export type LeadClassification = "hot" | "warm" | "cold";
export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

// ── Table Row Types ──

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string | null;
  name: string | null;
  location: string | null;
  education_level: string | null;
  field_of_study: string | null;
  institution: string | null;
  gpa: string | null;
  target_countries: string[] | null;
  course_interest: string | null;
  preferred_intake: string | null;
  test_type: string | null;
  test_score: string | null;
  budget_range: string | null;
  scholarship_interest: boolean;
  timeline: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

/** A single turn in the conversation transcript */
export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

/** A single sentiment reading per turn */
export interface SentimentEntry {
  turn: number;
  sentiment: "positive" | "neutral" | "negative" | "confused" | "excited";
  confidence: number;
}

export interface Conversation {
  id: string;
  student_id: string | null;
  room_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  status: ConversationStatus;
  transcript: TranscriptEntry[];
  sentiment_log: SentimentEntry[];
  extracted_data: Partial<StudentProfile>;
  language: string;
  created_at: string;
}

export interface LeadScore {
  id: string;
  conversation_id: string;
  student_id: string | null;
  intent_score: number;
  financial_score: number;
  timeline_score: number;
  total_score: number; // generated column
  classification: LeadClassification;
  recommended_actions: string[];
  notes: string | null;
  created_at: string;
}

export interface UniversityCourse {
  name: string;
  level: "UG" | "PG" | "PhD";
  duration: string;
  fees: string;
}

export interface UniversityProfile {
  id: string;
  name: string;
  country: string;
  city: string | null;
  ranking: number | null;
  courses: UniversityCourse[];
  requirements: {
    ielts_min?: number;
    pte_min?: number;
    toefl_min?: number;
    gpa_min?: string;
    a_level?: string;
  };
  costs: {
    tuition_min?: number;
    tuition_max?: number;
    living_annual?: number;
    currency?: string;
  };
  scholarships: {
    name: string;
    value: string;
    eligibility: string;
  }[];
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  student_id: string | null;
  counsellor_id: string | null;
  conversation_id: string | null;
  cal_event_id: string | null;
  scheduled_at: string;
  duration_mins: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Insert Types (for creating new rows) ──

export type UserInsert = Omit<User, "created_at" | "updated_at"> &
  Partial<Pick<User, "created_at" | "updated_at">>;

export type StudentProfileInsert = Omit<
  StudentProfile,
  "id" | "created_at" | "updated_at"
> &
  Partial<Pick<StudentProfile, "id" | "created_at" | "updated_at">>;

export type ConversationInsert = Omit<Conversation, "id" | "created_at"> &
  Partial<Pick<Conversation, "id" | "created_at">>;

export type LeadScoreInsert = Omit<
  LeadScore,
  "id" | "total_score" | "created_at"
> &
  Partial<Pick<LeadScore, "id" | "created_at">>;

export type AppointmentInsert = Omit<
  Appointment,
  "id" | "created_at" | "updated_at"
> &
  Partial<Pick<Appointment, "id" | "created_at" | "updated_at">>;

// ── Report Types ──

export interface UniversityRecommendation {
  name: string;
  country: string;
  city: string | null;
  ranking: number | null;
  course: string;
  match_reason: string;
  category: "ambitious" | "target" | "safe";
  tuition: string | null;
  requirements: Record<string, unknown>;
  scholarships: string[];
}

export interface GapAnalysis {
  strengths: string[];
  gaps: {
    category: string;
    description: string;
    action_items: string[];
  }[];
  overall_readiness: number;
}

export interface TimelineMilestone {
  month: number;
  title: string;
  description: string;
  type: "test" | "application" | "document" | "visa" | "milestone";
  completed: boolean;
}

export interface ConversationHighlight {
  topic: string;
  question: string;
  answer: string;
  relevance: "high" | "medium" | "low";
}

export interface NextStep {
  action: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
  completed: boolean;
}

export type ReportStatus = "generating" | "ready" | "failed";

export interface Report {
  id: string;
  conversation_id: string;
  student_name: string | null;
  profile_summary: Record<string, unknown>;
  university_recommendations: UniversityRecommendation[];
  gap_analysis: GapAnalysis;
  personalized_timeline: TimelineMilestone[];
  conversation_highlights: ConversationHighlight[];
  next_steps: NextStep[];
  lead_score_snapshot: {
    intent_score: number;
    financial_score: number;
    timeline_score: number;
    total_score: number;
    classification: LeadClassification;
  };
  sentiment_journey: SentimentEntry[];
  generated_at: string;
  status: ReportStatus;
  created_at: string;
}
