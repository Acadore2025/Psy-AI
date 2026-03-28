# PsyAI Platform

World-class behavioral intelligence platform. India + USA. Students + Professionals.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database + Auth | Supabase |
| AI Engine | Anthropic Claude (claude-sonnet-4-20250514) |
| Deployment | Vercel |

## Setup — Step by Step

### 1. Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → paste the contents of `supabase-schema.sql` → Run
3. Go to **Project Settings → API** → copy:
   - Project URL
   - anon/public key
   - service_role key (keep this secret)

### 2. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Make sure you have credits loaded

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add the same environment variables in Vercel dashboard under Settings → Environment Variables.

## Platform Flow

```
/ (landing)
  → /signup (name, email, password, country, age, persona)
  → /assessment (70 questions drawn from 480-question bank)
  → /report/[id] (complete behavioral report)
  → /dashboard (past reports, retake)
```

## Question Bank

- **480 questions** across 8 dimensions
- **India + USA versions** of every question
- **70 drawn per session** — excluded IDs tracked per user
- **6 retakes** before bank resets (420 questions = 6 × 70)
- **5 formats**: AG (Agree/Disagree), TC (This or That), SC (Situation Card), IP (Instant Pick, 8s timer), CS (Complete the Sentence)

### Dimensions

| Code | Dimension | Questions in Bank |
|------|-----------|-------------------|
| D1 | Personality | 60 |
| D2 | Interests | 60 |
| D3 | Aptitude | 60 |
| D4 | Values | 60 |
| D5 | Emotional Makeup | 60 |
| D6 | Motivation Pattern | 60 |
| D7 | Thinking Style | 60 |
| D8 | Work Style | 60 |

## Report Sections

1. Who You Actually Are (personality portrait)
2. Top 10 Career Matches (behaviorally justified)
3. Career Domain Scores (10 career worlds, 0-100)
4. Natural Strengths (5 abilities with evidence)
5. Under Pressure (stress response portrait)
6. What Drives You (motivation gap analysis)
7. Blind Spots (IP vs AG contradictions)
8. Growth Edges (3 specific, actionable)
9. 30-Day Action Plan (this week, month, 3 months)
10. Parent Note (under 22 only)

## Adding More Questions

Add questions to `lib/questions/d1-personality.ts` (or create d2, d3... files).
Each question needs:
- `question_id`: unique, e.g. `D2-AG-001`
- `dimension`: D1 through D8
- `facet`: sub-topic within dimension
- `type`: AG | TC | SC | IP | CS
- `text_india`: question text for India users
- `text_usa`: question text for USA users
- `options_india`/`options_usa`: for TC, SC, IP types
- `timer_seconds`: 8, for IP type only

Then import and add to `ALL_QUESTIONS` in `lib/questions/index.ts`.

## Architecture Notes

- API keys never reach the browser (all Claude calls go through `/api/score`)
- Row Level Security enabled on all Supabase tables
- Question tracking is per user per country — retakes always get fresh questions
- FREEZE signal captured when IP timer expires with no selection
- Timing data (first keystroke ms) captured and sent to scoring engine
