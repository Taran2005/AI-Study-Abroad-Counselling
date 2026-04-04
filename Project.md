● Got it, skipping the design process. Here's the straight analysis.
                                                                                                                                           
  ---                                                                                                                                        User Types (3)                                                                                                                                                                                                                                                                        ┌────────────┬───────────────────────────────────────────────────────────────────────────────┐                                             │    Role    │                                  Description                                  │                                             ├────────────┼───────────────────────────────────────────────────────────────────────────────┤                                             │ Student    │ Interacts with AI voice agent, views their summary/recommendations            │                                             ├────────────┼───────────────────────────────────────────────────────────────────────────────┤                                             │ Counsellor │ Views leads, student profiles, conversation transcripts, manages appointments │                                             ├────────────┼───────────────────────────────────────────────────────────────────────────────┤                                             │ Admin      │ Manages knowledge base, views analytics, manages counsellors, system config   │                                             └────────────┴───────────────────────────────────────────────────────────────────────────────┘                                                                                                                                                                                        ---                                                                                                                                      
  Auth (Supabase Auth)

  - Students: Passwordless — phone OTP or email magic link (low friction, they're leads not power users)
  - Counsellors: Email + password with role-based access
  - Admin: Email + password with admin role
  - Supabase RLS policies enforce role-based data access
  - JWT tokens with role claims, Next.js middleware checks roles per route

  ---
  Tech Stack

  ┌─────────────┬───────────────────────────────────────────────────────────────────────────────────────┐
  │    Layer    │                                      Technology                                       │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Frontend    │ Next.js 14 (App Router), Tailwind CSS, shadcn/ui                                      │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Voice Agent │ LiveKit Agents SDK (Python) + OpenAI GPT-4o (LLM) + OpenAI Whisper (STT) + OpenAI TTS │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Avatar      │ Anam AI SDK (browser-side, renders avatar synced to voice)                            │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Database    │ Supabase (Postgres + pgvector + Auth + Realtime)                                      │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ RAG         │ OpenAI Embeddings → Supabase pgvector, chunked knowledge docs                         │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ WhatsApp    │ Twilio WhatsApp API                                                                   │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Calendar    │ Cal.com API + Google Calendar API                                                     │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Realtime    │ Supabase Realtime (live dashboard updates)                                            │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Analytics   │ Recharts (charts on dashboard)                                                        │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Language    │ TypeScript (Next.js) + Python (LiveKit agent)                                         │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Deploy      │ Vercel (frontend) + Railway/Fly.io (Python agent)                                     │
  └─────────────┴───────────────────────────────────────────────────────────────────────────────────────┘

  ---
  Frontend Pages

  Public / Student-Facing

  1. / — Landing page (hero, features, CTA to start conversation)
  2. /login — Auth page (OTP/magic link for students, email/pass for staff)
  3. /talk — Voice agent page (Anam avatar + LiveKit room, main student interaction)
  4. /summary/[sessionId] — Post-call summary (extracted data, recommendations, next steps)
  5. /book/[counsellorId] — Appointment booking page (Cal.com embed)

  Counsellor Dashboard (/dashboard)

  6. /dashboard — Overview (today's leads, hot/warm/cold counts, recent calls)
  7. /dashboard/leads — Lead list with filters (score, status, date), search
  8. /dashboard/leads/[id] — Student detail (profile, transcript, score breakdown, recommended actions)
  9. /dashboard/appointments — Upcoming appointments, calendar view
  10. /dashboard/conversations — Live conversations view (realtime, Tier 2 bonus)

  Admin Panel (/admin)

  11. /admin — Analytics dashboard (call volume, conversion metrics, common questions)
  12. /admin/knowledge — Knowledge base management (upload docs, edit entries)
  13. /admin/counsellors — Manage counsellor accounts and availability
  14. /admin/settings — System config (scoring weights, notification rules)

  ---
  Complete User Flow

  Flow 1: Student Calls AI Agent

  Student lands on /
    → Clicks "Talk to AI Counsellor"
    → /talk page loads
    → Anam avatar appears, LiveKit room connects
    → Agent greets: "Hi! I'm here to help you explore study abroad options..."
    → Natural conversation begins:
        1. Agent asks name, collects basics naturally
        2. Asks about education background
        3. Asks about target countries, course preferences
        4. Asks about test scores (IELTS/PTE)
        5. Asks about budget, scholarship interest
        6. Asks about timeline
        → Throughout: answers student questions using RAG knowledge base
        → Throughout: detects sentiment, adapts tone
        → Throughout: remembers everything said (multi-turn memory)
    → Agent recommends 3 universities based on profile
    → Agent offers to book appointment with counsellor
        → If yes: Cal.com booking flow inline
    → Call ends
    → Lead score calculated (intent 40% + financial 30% + timeline 30%)
    → Student redirected to /summary/[sessionId]
    → WhatsApp message sent via Twilio (summary + recommendations)
    → Data saved to Supabase (profile, transcript, score, recommendations)
    → Counsellor dashboard updates in realtime

  Flow 2: Counsellor Reviews Leads

  Counsellor logs in → /dashboard
    → Sees today's stats: X hot leads, Y warm, Z cold
    → Clicks into /dashboard/leads
    → Filters by "Hot" (70-100 score)
    → Opens a lead → /dashboard/leads/[id]
    → Sees:
        - Student profile (all 12+ extracted data points)
        - Full conversation transcript
        - Lead score with breakdown (intent/financial/timeline)
        - Sentiment analysis summary
        - AI-recommended next actions
        - University recommendations made during call
    → Clicks "Call Back" or marks status
    → Checks /dashboard/appointments for upcoming booked slots
    → Views /dashboard/conversations for any live calls happening now

  Flow 3: Admin Manages System

  Admin logs in → /admin
    → Views analytics: call volume trends, avg scores, conversion rates, top questions
    → Goes to /admin/knowledge → uploads new university PDFs, edits FAQ entries
    → Vectors generated automatically, stored in pgvector
    → Goes to /admin/counsellors → adds/removes counsellors, sets availability
    → Goes to /admin/settings → adjusts lead scoring weights, notification rules

  ---
  Requirements by Feature

  Primary Objectives

  ┌─────┬──────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐        
  │  #  │           Feature            │                                      What to Build                                       │        
  ├─────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤        
  │ 1   │ Voice Agent                  │ LiveKit room + Python agent + OpenAI STT/TTS + Anam avatar sync                          │        
  ├─────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤        
  │ 2   │ Data Extraction (12+ points) │ OpenAI function calling to extract structured JSON during conversation                   │        
  ├─────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤        
  │ 3   │ Knowledge Base Counselling   │ Supabase pgvector RAG — chunk docs, embed, retrieve during agent conversation            │        
  ├─────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤        
  │ 4   │ Lead Scoring                 │ Post-call scoring function: intent(40%) + financial(30%) + timeline(30%) → hot/warm/cold │        
  ├─────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤        
  │ 5   │ Output Report                │ JSON profile + transcript + score breakdown stored in Supabase, rendered on summary page │        
  └─────┴──────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘        

  Tier 1 — Enhanced Intelligence

  ┌─────┬─────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
  │  #  │       Feature       │                                       What to Build                                       │
  ├─────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ 6   │ Sentiment Detection │ OpenAI prompt engineering — classify student emotion per turn, agent adapts system prompt │
  ├─────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ 7   │ Smart Follow-ups    │ Agent uses extracted data context to ask relevant next questions (prompt chaining)        │
  ├─────┼─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ 8   │ Multi-turn Memory   │ Conversation state object maintained in agent, full context passed each turn              │
  └─────┴─────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

  Tier 2 — Advanced

  ┌─────┬────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
  │  #  │          Feature           │                                 What to Build                                  │
  ├─────┼────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 9   │ University Recommendations │ Match student profile against university DB in pgvector, return top 3          │
  ├─────┼────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 10  │ WhatsApp Integration       │ Twilio API call post-conversation with formatted summary                       │
  ├─────┼────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 11  │ Live Dashboard             │ Supabase Realtime subscriptions on conversations table → live UI updates       │
  ├─────┼────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ 12  │ Regional Language          │ OpenAI Whisper handles Hindi/Marathi STT, GPT-4o responds in detected language │
  └─────┴────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

  Tier 3 — Premium

  ┌─────┬──────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │  #  │         Feature          │                          What to Build                          │
  ├─────┼──────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ 13  │ Appointment Booking      │ Cal.com embed + API for slot availability, Google Calendar sync │
  ├─────┼──────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ 14  │ Call Analytics Dashboard │ Aggregate queries on Supabase, Recharts visualizations          │
  └─────┴──────────────────────────┴─────────────────────────────────────────────────────────────────┘

  ---
  Data Model (Key Tables)

  - users — id, email, phone, role (student/counsellor/admin), created_at
  - student_profiles — user_id, name, location, education_level, field, institution, gpa, target_countries, course_interest, intake,       
  test_type, test_score, budget, scholarship_interest, timeline
  - conversations — id, student_id, started_at, ended_at, status (live/completed), transcript (JSONB), sentiment_log (JSONB)
  - lead_scores — conversation_id, student_id, intent_score, financial_score, timeline_score, total_score, classification (hot/warm/cold), 
  recommended_actions (JSONB)
  - knowledge_docs — id, title, content, embedding (vector), category, updated_at
  - appointments — id, student_id, counsellor_id, cal_event_id, scheduled_at, status
  - university_profiles — id, name, country, courses (JSONB), requirements (JSONB), costs (JSONB), embedding (vector)

  ---
  That's the full picture. Want me to write this up as a spec doc and move into implementation planning?

  📢 Full analysis done — three user types, fourteen pages, complete user flows, tech stack, data model, and all feature requirements      
  broken down by tier. Ready to move to implementation whenever you are.

  Problem
Fateh Education, a leading overseas education consultancy with 45,000+ successful
placements, faces challenges managing high-volume student inquiries. Traditional
phone-based systems suffer from:
Limited Counsellor Availability: Long wait times during peak admission seasons
lead to 30-40% student drop-offs
Inconsistent Data Collection: Manual note-taking results in incomplete student
profiles
Inefficient Lead Qualification: All leads receive equal attention, wasting
counsellor time on unqualified prospects
Repetitive Query Handling: 60-70% of counsellor time spent answering basic
FAQs
Challenge: Develop an AI Voice Agent that conducts preliminary student counselling,
collects structured information through natural conversation, and qualifies leads
intelligently—optimizing counsellor productivity and improving student experience.
Context
The overseas education industry is highly competitive and time-sensitive. Fateh
Education specializes in UK and Ireland university placements, IELTS/PTE training,
and partnerships with 120+ universities Fateh EducationFateh Education. The initial
student interaction is critical for building trust and winning enrollments.
An AI counselling system enables:
24/7 Instant Response: Students get immediate answers regardless of time zones
Consistent Quality: Every student receives standardized, accurate information
Data-Driven Decisions: Structured data enables personalized counselling
strategies
Resource Optimization: Counsellors focus on high-value activities like
application support

Primary Objectives
1. Conversational AI Voice Agent
Build a voice agent that:
Handles natural conversations in English and Hindi and Marathi
Maintains empathetic, encouraging tone for students
Responds with <3 second latency
Handles basic interruptions and clarifications
2. Information Extraction (Minimum 12 Data Points)
Extract through conversation:
Personal: Name, phone, email, location
Academic: Education level, field, institution, GPA/percentage
Preferences: Target countries (UK/Ireland/others), course interest, intake
timing
Test Status: IELTS/TOEFL score or preparation stage
Financial: Budget range, scholarship interest
Timeline: When they plan to apply
3. Basic Counselling with Knowledge Base
Answer common questions using a knowledge base:
University admission requirements
IELTS/PTE basics and preparation
UK/Ireland study costs and scholarships
Visa process overview
Application timeline

4. Lead Qualification Scoring
Assign lead scores (0-100) based on:
Intent Seriousness (40%): Specific questions, research level, clarity of goals
Financial Readiness (30%): Budget alignment, funding awareness
Timeline Urgency (30%): Application deadlines, test preparation status
Classification:
Hot (70-100): Immediate callback needed
Warm (40-69): Follow-up within 24 hours
Cold (0-39): Nurture campaign
5. Output Report Generation
Generate structured output:
Conversation transcript
Extracted data in JSON format
Lead score with breakdown
Recommended next actions for counsellors

Bonus Features
Tier 1 - Enhanced Intelligence
Sentiment Detection: Identify if student is excited/confused/hesitant and
adapt tone
Smart Follow-ups: Ask contextual questions based on previous answers
Multi-turn Memory: Remember details across the conversation without
repeating questions
Tier 2 - Advanced Features
University Recommendations: Suggest 3 suitable universities based on profile
during call
WhatsApp Integration: Send follow-up message with call summary and
recommendations
Live Dashboard: Real-time view of ongoing conversations with lead scores
Regional Language Support: Add one regional language
(Punjabi/Gujarati/Other)
Tier 3 - Premium Features
Appointment Booking: Integrate calendar to book counsellor slots during the
call
Call Analytics Dashboard: Show call volume trends, common questions,
conversion metrics