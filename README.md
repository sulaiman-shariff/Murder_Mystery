# Murder Mystery

An interactive AI-powered murder mystery game built with Next.js and Supabase.

## Architecture

```
Next.js App Router (Vercel)
├── React 19 client components (dark theme, Tailwind CSS 4)
├── 17 API Route Handlers (teams, sessions, AI, admin, leaderboard)
├── Supabase PostgreSQL (events, teams, game_sessions, ai_interactions)
└── Google Gemini 2.5 Flash-Lite (validation, hints, detective chat)
```

## Features

- **3 complete mysteries** with suspects, evidence, timelines, and story sections
- **AI-powered validation** of murderer and motive guesses using Gemini
- **Structured JSON responses** with status handling (correct/incorrect/ambiguous/unavailable)
- **AI hints** with 5 progressive levels per mystery
- **AI detective chat** for investigating suspects and evidence
- **Team registration** with PIN-based auth and event codes
- **Real-time scoring** with time, hint, and wrong-attempt penalties
- **Session persistence** across devices via Supabase
- **Leaderboard** with ranking by cases completed, score, and time
- **Admin dashboard** with team management, reset controls, and data clearing
- **Responsive design** for desktop and mobile

## Quick Start

### Prerequisites

- Node.js >= 20.9.0
- Supabase project
- Google Gemini API key

### Setup

```bash
git clone <repository-url>
cd Murder_Mystery
npm install
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
AI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.5-flash-lite
ADMIN_PASSCODE=your-admin-passcode
```

### Database

Run migrations against your Supabase database:

```bash
npm run migrate -- supabase/migrations/001_schema.sql
npm run migrate -- supabase/migrations/002_rls_fix.sql
npm run migrate -- supabase/migrations/003_session_columns.sql
```

Seed an event:

```bash
DATABASE_URL="postgresql://..." EVENT_CODE=ATRIA node scripts/seed-event.js
```

### Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run lint:fix   # ESLint auto-fix
npm run typecheck  # TypeScript check
```

## Game Mechanics

### Scoring

| Component | Value |
|---|---|
| Base score | 1000 |
| Time penalty | -10 per minute |
| Wrong attempt penalty | -150 each |
| Hint penalty | -100 each |
| Speed bonus (under 30 min) | +50 |
| Minimum score | 100 |

Scoring is computed server-side from the event configuration. The client sends stats (elapsed time, wrong attempts, hints used) and the server calculates and stores the final score.

### Attempts

- Default maximum: 10 wrong attempts (configurable per event)
- Ambiguous answers (low AI confidence) do **not** count as wrong attempts
- Unavailable AI responses do **not** count as wrong attempts
- Duplicate rapid submissions are prevented

### Session Lifecycle

1. Register or login with team name + PIN + event code
2. System creates or resumes an active session
3. During play, state (notes, evidence, counters) syncs to Supabase
4. On completion, the session is marked completed, next mystery session is created
5. Results display on the result page before advancing

### AI Validation

All AI calls use structured JSON prompts with Gemini 2.5 Flash-Lite:
- **Murderer validation**: accepts full names, partial names, titles, misspellings, and clear descriptions
- **Motive validation**: checks against required concepts and acceptable interpretations, rejects common incorrect answers
- **Hints**: generated from mystery hint plans with level-based progressive revelation
- **Detective chat**: answers from supplied case data only

## Admin Controls

Access at `/admin`. Login with the `ADMIN_PASSCODE`.

- View all registered teams
- Delete teams and their sessions
- Reset progress per mystery
- Clear all data
- View public leaderboard

## AI Connectivity

AI validation, hints, and detective chat require connectivity to the Gemini API. The game **does not** offer full offline play. A health endpoint (`/api/health/ai-readiness`) checks AI availability separately from the general health check.

## Deployment

1. Push to GitHub
2. Import into Vercel (framework: Next.js)
3. Add all environment variables in Vercel project settings
4. Deploy

## Data Storage

- **Supabase**: Team registration, game sessions, AI interaction logs, leaderboard
- **localStorage**: Timer state, notes drafts, evidence marks (namespaced by event + team + mystery)

## License

MIT
