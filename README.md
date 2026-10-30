# FocusTrack – Production Productivity for Devs

A production-quality, unique productivity web app built around 3 focus tracks + Daily Tech News. Dark-first, calm design, track accent colors: CP blue, Academic green, Vibe purple.

**Live Demo**: Deploy to Vercel (see Deployment)

## Product Summary

**Tracks:**
1. **Competitive Programming (CP – blue)**: Daily learning to-dos (topic, problem link, rating, estimate), quick-log solved problem (rating, topics, time, result), AI Path Analyser ("Is my path correct?") with verdict, strengths/gaps, next 7 days plan, resources whitelist (CP-Algorithms, USACO Guide, CSES, Codeforces EDU, AtCoder DP/ABC, NeetCode), best-time heatmap from FocusSession+Logs, contests panel (CF + CC) with countdown, timezone, add to calendar, remind me.
2. **Academic (green)**: Student to-dos (subject, chapter, deadline, difficulty, estimate), AI Academic Guide (workload assessment, prioritised plan, study techniques applied to THIS subject, risks, weekly schedule), deadline conflict & overload detection.
3. **Vibe Coding & Prompting (purple)**: Daily lesson auto-generated at user's local midnight stable all day (concept, bad vs good prompt, exercise, build challenge), levels L1-L7 (Beginner → Evaluation), XP, level-up thresholds, streaks, Prompt Library (save prompts with rating worked/didn't + notes), AI Prompt Reviewer (score /10 + improvements + rewritten).
+ **Sub-section: Daily Tech News**: Aggregate HN API, dev.to API, 3 RSS (freeCodeCamp, CSS-Tricks, AI News), deduplicate by URL, title/source/time/tags/link original (no full copy), filter chips (AI, Web, CP/Algorithms, Open Source), bookmark.

**Shared Tools:** Profile, Calendar (unified tasks/exams/contests/focus sessions, month/week/day, drag to reschedule tasks, colour by track), Clock/World Clock (user TZ +2 selectable), Stopwatch, Countdown (exam/contest), Pomodoro (25/5 configurable linked track/task, timestamps drift-free, persist localStorage + sync FocusSession, sound + Web Notifications), Exam Preparation (subject, date, syllabus confidence 1-5, countdown, AI day-by-day plan backwards from exam date based on daily hours & weakness, revision scheduler SR 1-3-7-14 days, mock-test log chart Recharts), Dashboard (today's tasks, next contest, streaks, weekly focus hours chart, XP bars, today's lesson card, exam countdowns), Global command palette Ctrl+K, quick-add, keyboard shortcuts, drag-drop TODO/DOING/DONE, badges, notifications centre, export/import JSON, onboarding wizard (Phase 1 placeholder).

## Tech Stack (Fixed)

- Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS + shadcn/ui + lucide-react, dark/light next-themes
- DB: PostgreSQL + Prisma ORM (Neon/Supabase)
- Auth: Auth.js (NextAuth v5 beta) email + Google/GitHub
- State: TanStack Query; Zustand only for timer/clock UI state (persist)
- Validation: Zod on every API input and every AI output (with repair retry)
- AI: provider-agnostic `lib/ai/provider.ts` env AI_PROVIDER (openai/anthropic/google/groq/ollama), AI_MODEL, AI_API_KEY, called ONLY server routes
- Cache/Rate Limit: Upstash Redis (contests, news, AI responses 10 min, rate limit 20/day)
- Cron: Vercel Cron hitting `/api/cron/*` (contests every 30 min, news every 2h, daily lesson 00:05 UTC)
- Calendar: Custom month/week/day (FullCalendar alternative) with date-fns, drag to reschedule
- Charts: Recharts (mock-test trend, weekly hours)
- PWA: installable, offline shell via `public/sw.js`, manifest.webmanifest, Web Notifications for contest/timer alerts, `RegisterSW` component handles install prompt + notification permission
- Tests: Vitest unit (gamification, best-time, news dedup, resource whitelist), Playwright smoke e2e (login skip → dashboard, CP, news, focus, manifest)
- Quality: ESLint, Prettier, Husky pre-commit with lint-staged

## Directory Structure (Followed Exactly + extras)

```
focustrack/
├─ prisma/schema.prisma (models: User, Profile, Task, CpProblemLog, AiReview, Contest unique(platform,externalId), PromptLesson unique(userId,date), UserProgress unique(userId,track), FocusSession, Exam, StudyPlanItem, NewsItem unique(url), NewsBookmark, PromptLibrary, ExamMockTest)
├─ src/app/(auth)/login/page.tsx
├─ src/app/(app)/layout.tsx (sidebar+topbar shell + RegisterSW PWA)
├─ src/app/(app)/dashboard/page.tsx (today tasks, next contest real, streaks, weekly focus chart, XP bars, lesson card, exam countdowns)
├─ src/app/(app)/cp/page.tsx (tasks board + quick-log + AI analyser + contests)
├─ src/app/(app)/academic/page.tsx (tasks board + AI guide)
├─ src/app/(app)/vibe/page.tsx (daily lesson auto-generated midnight stable, levels, Prompt Reviewer, Prompt Library)
├─ src/app/(app)/news/page.tsx (HN+dev.to+3 RSS, dedup, filter chips, bookmark)
├─ src/app/(app)/exams/page.tsx (exam CRUD, countdown, syllabus confidence 1-5, AI backwards plan, SR 1-3-7-14, mock test chart)
├─ src/app/(app)/calendar/page.tsx (unified tasks/exams/contests/focus, month/week/day, drag reschedule, colour track)
├─ src/app/(app)/focus/page.tsx (world clock +2 zones, stopwatch, countdown, pomodoro linked track/task, timestamps drift-free, persist localStorage + sync FocusSession, sound+notification)
├─ src/app/(app)/profile/page.tsx (avatar, bio, timezone Intl auto-detect editable, handles, goals, per-track level/XP/streak, badges, export JSON)
├─ src/app/api/tasks, ai/review, ai/lesson, ai/prompt-review, contests, news, news/bookmarks, exams, exams/[id], exams/[id]/study-plan, exams/[id]/mock-tests, focus-sessions, profile, profile/export, prompt-library, prompt-library/[id], cron/contests,news,daily-lesson
├─ src/components/ui (shadcn), tasks (TaskList, TaskForm, TaskCard), ai (AiReviewPanel, ResourceList), contests (ContestCard, ContestList), timers (Clock, Stopwatch, Countdown, Pomodoro), calendar (CalendarView), exams (ExamForm, ExamCard, MockTestChart), vibe (LessonCard, LevelProgress, PromptReviewer, PromptLibrary), charts (Recharts), news (NewsCard, NewsList), pwa (RegisterSW)
├─ src/lib/ai (provider.ts, prompts.ts, schemas.ts, review.ts), contests (codeforces.ts, codechef.ts, normalize.ts, service.ts), news (sources.ts, service.ts), gamification (xp.ts, levels.ts, streaks.ts), analytics (best-time.ts), exams (study-plan.ts)
├─ public/sw.js, icon-192.png, icon-512.png
├─ tests/unit, tests/e2e
├─ .env.example, vercel.json (crons), vitest.config.ts, playwright.config.ts
└─ README.md
```

## Data Model (Prisma)

- User, Profile (displayName, bio, avatar, timezone auto-detect Intl editable, codeforcesHandle, codechefHandle, currentLevelPerTrack via UserProgress, goals JSON, weeklyTargetHours)
- Task (id, userId, track enum[CP,ACADEMIC,VIBE], title, notes, status enum[TODO,DOING,DONE], priority LOW/MED/HIGH/URGENT, dueAt, estimateMin, tags[], createdAt, completedAt) indexes userId+track, status, dueAt
- CpProblemLog (taskId?, platform CODEFORCES|CODECHEF|OTHER, problemUrl, rating, topics[], result SOLVED|PARTIAL|FAILED|EDITORIAL_USED, timeSpentMin)
- AiReview (userId, track, inputSnapshot JSON, output JSON)
- Contest (platform CODEFORCES|CODECHEF, externalId, name, startTime UTC, durationSec, url, phase) unique(platform,externalId), index startTime
- PromptLesson (userId, date, level, title, concept, badPromptExample, goodPromptExample, exercise, buildChallenge, completed) unique(userId,date)
- UserProgress (userId, track, xp, level, streakDays, lastActiveDate) unique(userId,track)
- FocusSession (userId, track?, taskId?, type POMODORO|TIMER|STOPWATCH, plannedSec, actualSec, startedAt)
- Exam (userId, subject, examDate, syllabusTopics JSON [{topic, confidence 1-5, status}], targetScore) + StudyPlanItem (examId, date, topic, durationMin, done) + ExamMockTest (examId, date, score, total, notes)
- NewsItem (source, title, url unique, publishedAt, summary, tags[]) + NewsBookmark unique(userId,newsItemId)
- PromptLibrary (userId, title, prompt, rating WORKED|DIDNT_WORK, notes, tags)

## Features Detail

### CP Track
- Tasks with rating/topics via tags, quick-log form
- AI Path Analyser: last 30 days tasks+logs+handles+goal+focus sessions → prompt template in lib/ai/prompts.ts (role, allowed inputs, JSON schema, forbidden: never invent contest results, only whitelisted resources, sparse handling) → provider call → Zod validate + retry repair → cache 10 min identical hash SHA256, rate limit 20/day via Redis, stored AiReview
- Best time: lib/analytics/best-time.ts from FocusSession+CpProblemLog solve rate & avg time per hour-of-day, min 10 samples, heatmap, default window "9 AM - 12 PM default not personalised"
- Contests: Codeforces official API contest.list server-side, CodeChef primary codechef.com/api/list/contests/all + fallback kontests.net + clist.by behind interface, normalize into Contest model, cache Redis 30 min, cron /api/cron/contests secured by CRON_SECRET (Bearer/x-cron-secret/query), stale badge if both fail serving last cached/DB

### Academic
- Tasks subject/chapter/deadline/difficulty/estimate via title/notes/tags/dueAt/priority/estimateMin
- AI Academic Guide: tasks/deadlines/subjects/exams/completion → workloadAssessment, prioritisedPlan, studyTechniques specific to THIS subject (active recall, spaced repetition), risks, weeklySchedule, detects deadline conflicts (>1 same day) & overload (>weeklyTargetHours)

### Vibe Coding & Prompting
- Daily lesson auto-generated at user's local midnight stable all day: cron 00:05 UTC generates for all users timezone-aware + on-demand GET generates if missing for today in user's timezone (en-CA formatter), level from UserProgress VIBE, XP 20+level*10 on complete, level-up thresholds [0,100,300,600,1000,1500,2200,3000], streak via calculateStreak, stored PromptLesson unique(userId,date)
- Prompt Library: save prompts with rating worked/didn't + notes + tags, +3 XP
- Prompt Reviewer: paste prompt → score /10 + strengths/issues + improvedPrompt + tips, Zod validated, cached 10 min, rate limited, +2 XP

### News
- HN API topstories + item, dev.to API top, 3 RSS (freeCodeCamp, CSS-Tricks, AI News) via simple regex parser, deduplicate by URL normalized without ?#, filter chips AI/Web/CP-Algorithms/Open Source inferred via keywords, bookmark via NewsBookmark, cache Redis 2h, cron /api/cron/news every 2h

### Calendar
- Unified: tasks with due dates, exams, study-plan items, contests, focus sessions; month/week/day views via date-fns, drag to reschedule tasks (draggable task events → PATCH dueAt midday), colour by track (CP blue, Academic green, Vibe purple, Exam red, Contest amber/blue, Focus gray)

### Clock/Timer
- World clock user timezone auto-detect Intl +2 extra selectable zones (Zustand persist), Stopwatch timestamp-based Date.now() drift-free, persist localStorage + sync FocusSession on stop, countdown target date/time exam/contest, Pomodoro 25/5 default configurable work/break/long/sessionsBeforeLong linked track & task, timestamps survive refresh, sound data URI + Web Notification via Notification API + SW message

### Exam Prep
- Create exam: subject, date, syllabus topics confidence 1-5 + status, targetScore, countdown live d/h/m/s, AI day-by-day plan backwards from exam date based on available daily hours & weakness (sorted confidence asc), revision scheduler SR 1,3,7,14 days forward, topic checklist confidence badges destructive if ≤2, mock-test log score/total/notes + Recharts trend

### Profile & Dashboard
- Profile: avatar from session image or initials, bio, timezone, handles, goals JSON, weeklyTargetHours, per-track level/XP/streak from UserProgress, badges (First Task, Streak 3, CP Grinder, Prompt Master, Exam Ready), export JSON via /api/profile/export (9 tables)
- Dashboard: today's tasks across tracks, next contest real with countdown timezone, current streaks flame, weekly focus hours chart last 7 days from FocusSessions total vs target bar mini, track XP bars done%, today's lesson card L level concept slice, exam countdowns, spec compliance notes

## AI Layer Requirements (Implemented)

- System prompts in lib/ai/prompts.ts one per feature, each role, allowed inputs, output JSON schema, forbidden behaviours, injection guard delimited block <<<DATA>>>
- Every AI response parsed via extractJson (code fence or first { last }) then JSON.parse then Zod validate on failure retry once with repair instruction, then friendly error
- Cache identical requests 10 min via SHA256 hash of inputSnapshot, Redis with memory fallback, rate limit per user 20/day via Redis incr
- Never send personal data beyond needed, user text in delimited data block, never in system prompt
- Provider-agnostic service lib/ai/provider.ts selected by env AI_PROVIDER, AI_MODEL, AI_API_KEY, called ONLY server routes

## Workflow

- Request: Client → TanStack Query → Next.js route handler → Zod validation → auth check (fallback demo@focustrack.dev in dev) → service layer lib/* → Prisma/Redis/AI provider → typed JSON
- Background: Vercel Cron → /api/cron/* secured by CRON_SECRET → fetch external source → normalize → upsert DB → invalidate Redis keys
- AI: collect user data → build prompt from template → provider call → Zod validate → store AiReview → return UI

## Setup & Commands

```bash
git clone <repo> && cd focustrack
npm install
cp .env.example .env
# Fill:
# DATABASE_URL=postgresql://user:pass@host:5432/focustrack?sslmode=require (Neon/Supabase)
# AUTH_SECRET=openssl rand -base64 32
# AUTH_URL=http://localhost:3000
# AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (optional)
# AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (optional)
# EMAIL_SERVER=smtp://... EMAIL_FROM=noreply@...
# AI_PROVIDER=openai AI_MODEL=gpt-4o-mini AI_API_KEY=sk-...
# UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (optional – falls back memory)
# CRON_SECRET=super-secret-cron-token (for cron auth)
# CODEFORCES_API_URL=https://codeforces.com/api (default)
# CODECHEF_CONTEST_URL optional, FALLBACK_CONTEST_API optional

npx prisma generate
npx prisma db push   # or migrate dev
npm run db:seed      # creates demo@focustrack.dev with tasks, contests, news

npm run dev          # http://localhost:3000
npm run build        # should pass
npm run test         # vitest unit
npm run e2e          # playwright smoke (needs dev server)
npx playwright test  # or npm run e2e
```

## PWA

- `public/sw.js`: install cache offline URLs (/ , /dashboard, /cp, etc), activate delete old caches, fetch handler network first then cache fallback, skip /api/ returns offline JSON, push notification handling, message SHOW_NOTIFICATION for timer/contest alerts
- `src/app/manifest.ts`: name FocusTrack, start_url /dashboard, display standalone, background #020617, icons /icon-192.png /icon-512.png (placeholder blue PNGs, replace with real)
- `src/components/pwa/RegisterSW.tsx`: registers sw.js if supported, handles online/offline events, beforeinstallprompt deferredPrompt for Install App button, notification permission request, shows badges offline shell ready, installed, notifications ON, installable
- Integrated in `(app)/layout.tsx` above children
- Offline page `/offline` shows cached shell message
- Web Notifications: ContestCard Remind me 10 min before, timers on complete, RegisterSW test notification via SW message

Installable: Chrome → Install App prompt, offline shell works, notifications for contest/timer.

## Tests

- **Vitest unit** `tests/unit/xp.test.ts`: XP per priority, xpForLesson scaling, level from XP, progressPct, thresholds increasing, streak continuation/break, best-time default vs personalized, heatmap stats
- `tests/unit/news.test.ts`: deduplicate by URL, resource whitelist filtering
- Run: `npm run test` → vitest run
- **Playwright smoke** `tests/e2e/smoke.spec.ts`: login loads, skip auth → dashboard, CP page loads with Phase badge, news page loads, focus page timers present, manifest webmanifest exists with icons
- Run: `npx playwright test` or `npm run e2e` (starts dev server via webServer config)

## Deployment (Vercel)

1. Create Vercel project, import repo
2. Add Environment Variables in Vercel dashboard (from .env.example)
   - DATABASE_URL (Neon/Supabase pooled)
   - AUTH_SECRET (generate: `openssl rand -base64 32`)
   - AUTH_URL = your vercel URL https://your-app.vercel.app
   - AUTH_GOOGLE_ID/SECRET, AUTH_GITHUB_ID/SECRET optional
   - AI_PROVIDER, AI_MODEL, AI_API_KEY (OpenAI etc)
   - UPSTASH_REDIS_REST_URL/TOKEN (Upstash Redis)
   - CRON_SECRET (random)
3. `vercel.json` already defines crons:
   - `/api/cron/contests` every 30 min `*/30 * * * *`
   - `/api/cron/news` every 2 hours `0 */2 * * *`
   - `/api/cron/daily-lesson` daily 00:05 UTC `5 0 * * *`
   Vercel will auto-create Cron Jobs, calls secured by CRON_SECRET header (Vercel sends? We check Bearer/x-cron-secret/query). Ensure CRON_SECRET set, otherwise dev allows
4. Deploy: `vercel --prod`
5. After deploy, run `npx prisma db push` against production DB? Better use migrate: `prisma migrate deploy`
6. Seed optional: create demo data via `tsx prisma/seed.ts` with prod DATABASE_URL
7. Test PWA: open deployed URL on mobile, Install App prompt, offline test airplane mode → dashboard still loads, tasks cached, timers work

## Quality

- Responsive mobile-first, WCAG AA contrast (HSL vars, dark theme #020617), keyboard accessible, loading skeletons and empty states everywhere (TaskList skeletons, News skeletons, etc)
- All times stored UTC (Prisma @db.Timestamptz), displayed in user timezone (Profile.timezone auto-detect Intl, editable, useTimezone hook)
- No secrets in client bundle (AI keys only server, CRON_SECRET only server, DATABASE_URL only server)
- Optimistic updates on task changes (useUpdateTask, useDeleteTask with cancelQueries + setQueryData + invalidate)
- Clean visual identity calm dark-first, track accent colours: CP blue #2563eb, Academic green #16a34a, Vibe purple #9333ea

## Verification Full Flow (All Phases)

- [ ] Phase1: setup, Prisma schema, auth shell, theme, .env.example – `npm run build` passes
- [ ] Phase2: Task CRUD + 3 track boards drag-drop @dnd-kit, quick-log CP, search, tags, XP, dashboard real counts
- [ ] Phase3: AI provider-agnostic + mock, prompts stored, Zod + repair retry, cache 10 min SHA256, rate limit 20/day, CP analyser verdict/resources whitelist stale handling, Academic guide overload/conflict detection, injection guard
- [ ] Phase4: Contests CF official API + CC primary+fallback kontests/clist.by, normalize, Contest model, Redis cache 30 min, cron 30 min secured, stale badge, UI countdown timezone, add calendar GCal+.ics, remind me Notification+localStorage
- [ ] Phase5: Vibe daily lesson auto-generated local midnight stable, levels L1-L7 thresholds, XP 20+level*10, streaks, Prompt Library rating worked/didn't + notes +3 XP, Prompt Reviewer score/10 + improved version cached
- [ ] Phase6: World clock user TZ +2 extra selectable Zustand persist, Stopwatch timestamp drift-free persist localStorage + sync FocusSession + sound+notification, Countdown target exam/contest, Pomodoro 25/5 configurable linked track/task timestamp survive refresh + sound+notification + FocusSession
- [ ] Phase6 Calendar: unified tasks/exams/contests/focus, month/week/day views date-fns, drag reschedule tasks PATCH dueAt midday, colour by track
- [ ] Phase7: Exam subject/date/syllabus confidence 1-5 status, countdown live, AI backwards plan daily hours & weakness, SR 1-3-7-14, topic checklist confidence badges, mock-test log chart Recharts, Profile avatar/bio/timezone auto-detect Intl editable handles/goals/weeklyTarget + per-track level/XP/streak + badges + export JSON, Dashboard today's tasks, next contest real countdown, streaks, weekly focus chart 7 days FocusSessions, XP bars, lesson card, exam countdowns
- [ ] Phase8: News HN API + dev.to + 3 RSS freeCodeCamp/CSS-Tricks/AI News dedup URL, title/source/time/tags/link original no full copy, filter chips AI/Web/CP/Open Source via keywords, bookmark unique(userId,newsItemId) + API, cache Redis 2h, cron 2h, PWA installable offline shell sw.js cache dashboard etc, manifest icons 192/512, RegisterSW install prompt + notification permission, Web Notifications contest/timer alerts, Vitest unit xp/levels/streaks/best-time/news dedup/whitelist, Playwright smoke 5 tests, README deployment steps

## ENV Example (All Vars Documented)

See `.env.example`:
- DATABASE_URL
- AUTH_SECRET, AUTH_URL, AUTH_GOOGLE_ID/SECRET, AUTH_GITHUB_ID/SECRET, EMAIL_SERVER, EMAIL_FROM
- AI_PROVIDER (openai/anthropic/google/groq/ollama), AI_MODEL, AI_API_KEY, OLLAMA_BASE_URL optional
- UPSTASH_REDIS_REST_URL/TOKEN
- CRON_SECRET
- CODEFORCES_API_URL, CODECHEF_CONTEST_URL, FALLBACK_CONTEST_API

## License

MIT
