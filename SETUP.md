# PsyAI — Complete Setup Guide

## Step 1: Supabase

1. Go to supabase.com → New project
2. SQL Editor → paste `supabase-schema.sql` → Run
3. Authentication → Settings → Email:
   - Enable email confirmations: YES (optional but recommended)
   - Set Site URL: your production URL
4. Project Settings → API → copy these 3 values for `.env.local`:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

## Step 2: Anthropic

1. console.anthropic.com → API Keys → Create key
2. Add credits (each assessment costs ~$0.15-0.30)
3. Copy key → ANTHROPIC_API_KEY in `.env.local`

## Step 3: Local Development

```bash
cp .env.example .env.local
# Fill in the 4 values above

npm install
npm run dev
# Open http://localhost:3000
```

## Step 4: Deploy to Vercel

```bash
npm install -g vercel
vercel

# When prompted:
# - Link to existing project: No
# - Project name: psyai-platform
# - Framework: Next.js
# - Root directory: ./

# Then add environment variables in Vercel dashboard:
# Settings → Environment Variables → add all 4 from .env.local
```

## Step 5: Post-Deploy

1. Go to Supabase → Auth → URL Configuration:
   - Site URL: your-vercel-url.vercel.app
   - Redirect URLs: your-vercel-url.vercel.app/**

2. Test the full flow:
   - Sign up → India → School → Take assessment
   - Complete all 72 questions
   - Verify report generates correctly
   - Test PDF download

3. Admin panel: your-domain.com/admin
   - Default PIN: 2026 (change in NEXT_PUBLIC_ADMIN_PIN)

## File Structure

```
app/
  page.tsx              Landing page
  signup/page.tsx       2-step signup
  login/page.tsx        Login
  assessment/page.tsx   72-question assessment
  report/[id]/page.tsx  Full report
  dashboard/page.tsx    User dashboard
  admin/page.tsx        Admin panel

  api/
    session/route.ts    Draw questions, track answered
    score/route.ts      Call Claude, generate report
    report/pdf/route.ts PDF export (browser print)

lib/
  questions/            360-question bank (8 dimensions × ~45)
  scoring/engine.ts     Claude scoring prompt
  supabase/             Auth clients
```

## Customization

### Change number of questions per session
In `lib/questions/index.ts` → change `PER_DIM = 9`

### Add more questions
Add to relevant `lib/questions/dN-*.ts` file
Must have unique `question_id` like `D1-AG-041`

### Change scoring model
In `app/api/score/route.ts` → change `model: 'claude-sonnet-4-20250514'`

### Add more careers
The scoring engine already maps to 10 career worlds.
Edit `lib/scoring/engine.ts` to modify career descriptions or mapping rules.
