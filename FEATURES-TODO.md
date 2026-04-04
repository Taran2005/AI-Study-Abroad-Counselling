# StudyBuddyAI — Features Left to Implement

## High Impact (Hackathon Winners)

### 1. Ghost Counsellor Mode
AI copilot sidebar for human counsellors. Instead of full-AI, the agent listens alongside a real counsellor and shows real-time suggestions on a side panel. Student mentions IELTS 6.5? Panel instantly shows eligible universities, talking points, and scholarship options.
- Reuses existing university matching logic
- New UI: sidebar/overlay panel on counsellor dashboard
- Toggle between full-AI mode and ghost/copilot mode
- Real-time transcript + suggestion cards

### 2. Emotional Voice Heatmap
Post-call visualization — color-coded waveform/timeline showing where the student was confident (green), uncertain (yellow), stressed (red). Counsellor sees: "At 2:14 they got anxious about budget — lead with scholarships."
- Sentiment detection already exists — needs per-segment scoring stored
- Frontend: timeline/waveform component with color-coded segments
- Clickable segments that jump to transcript moments
- Summary insights: "Student showed stress around budget (3 moments)"

### 3. "What If" Simulator
Extends existing lead scoring. Shows: "With your current profile you match 4 universities. But bump your IELTS from 6.0 to 6.5 and 3 more open up including University of Glasgow."
- Slider/input UI for adjustable parameters (IELTS, GPA, budget)
- Real-time recalculation of university matches and acceptance probability
- Before/after comparison cards
- Can be shown during call (agent suggests) or on summary page

### 4. n8n Post-Call Chain Reaction
One call ending triggers 5+ actions simultaneously via n8n:
- Student profile saved to Supabase (already done)
- WhatsApp summary sent via Twilio (already done — enhance with richer formatting)
- Hot lead? Slack alert to counsellor with student snapshot
- Personalized PDF "Study Plan" generated and emailed
- Calendar booking link sent via WhatsApp/email
- All visible on a split-screen demo: call ends, everything lights up

**New infrastructure needed:** n8n (self-hosted Docker), webhook endpoint from voice agent

---

## Medium Impact (Polish & Wow Factor)

### 5. PDF Study Plan Generation
Auto-generated personalized PDF after every call containing:
- Student profile summary
- Recommended universities with match percentages
- Personalized timeline/roadmap
- Next steps and action items
- Sent via email + WhatsApp attachment

**Tech:** Puppeteer or react-pdf for generation, n8n for delivery

### 6. Voice-to-Visual Personalized Roadmap
After the call, auto-generate a beautiful timeline:
- IELTS prep (May) → Applications (June) → Visa (August) → Flight (September)
- Customized from what the student actually said
- Rendered as image, sent via WhatsApp
- Also displayed on the /summary page

**Tech:** Timeline component (frontend) + image render (puppeteer screenshot or canvas)

### 7. Slack/Email Alerts for Hot Leads
When lead score > 70:
- Slack message to assigned counsellor channel with student snapshot
- Email notification with one-click "View Lead" link
- Configurable thresholds in admin settings

**Tech:** n8n workflow or direct Slack/email API calls from post-call webhook

---

## Nice-to-Have (If Time Permits)

### 8. Visa Interview Practice Mode
After counselling, offer: "Want to practice a mock visa interview?" AI switches persona to a visa officer, asks realistic questions, scores answers, gives feedback.
- Prompt switch (new system prompt for visa officer persona)
- Scoring rubric for answers (confidence, completeness, consistency)
- Summary report after practice session
- ~1 hour of work — mostly prompt engineering

### 9. Omnichannel — Telegram/Discord/Web Chat
Same AI brain accessible via text channels. Student can continue conversation via:
- Telegram bot
- Discord bot
- Web chat widget (embedded on partner sites)
- All feed into the same Supabase pipeline

**Tech:** n8n handles routing regardless of input channel

### 11. Auto-Scraping for RAG Knowledge Base
n8n scrapes Fateh Education's site + partner university pages → chunks into vector DB → voice agent queries during calls. Knowledge updates itself.
- n8n workflow: scheduled scrape → chunk → embed → upsert to pgvector
- Admin UI shows last sync status and source URLs
- ~1-2 hours

### 12. Google Sheets + Looker Studio Dashboard
All call data flows to Google Sheets via n8n. Looker Studio auto-dashboard shows:
- Call volume over time
- Lead distribution (hot/warm/cold)
- Conversion funnel
- Top questions asked
- Zero backend needed — just Google products stitched together

---

## Already Partially Done (Finish These)

| Feature | What Exists | What's Missing |
|---|---|---|
| Sentiment Detection → Heatmap | Per-turn sentiment classification | Visual timeline component, per-segment storage |
| Lead Scoring → "What If" | Scoring function (intent/financial/timeline) | Simulator UI, conditional recalculation |
| WhatsApp → Full Chain Reaction | Single summary message | n8n orchestration, PDF, Slack, calendar link |

---

## Priority Order for Implementation

1. Ghost Counsellor Mode (high impact, reuses existing code)
2. Emotional Heatmap (high visual impact, sentiment already exists)
3. "What If" Simulator (extends existing scoring)
4. n8n Chain Reaction (the demo showstopper)
5. PDF Study Plan
6. Roadmap Timeline
7. Slack/Email Alerts
8. Visa Interview Practice
9. Everything else (cut from bottom up if time runs out)
