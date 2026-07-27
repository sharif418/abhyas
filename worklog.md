# অভ্যাস (Abhyas) — Project Worklog

## Project Overview
**অভ্যাস** is a premium, fully-Bengali self-discipline / habit-tracking Progressive Web App
(PWA) built with Next.js 16. It is the web adaptation of a mobile-app proposal
(React Native + Kotlin) — the proposal explicitly allowed a Next.js PWA path, which is
the senior-architect choice for this environment.

**Core USP**: Deep Islamic integration (prayer tracking, Quran reading, duas, tasbih) +
offline-first persistence + Bengali-first UI + gamification, targeted at Bangladesh users.

---

## Task ID: 1–12 (Foundation → Verification)
**Agent**: Z.ai Code (Principal Architect)

### Work Log
- Read & internalized both PDFs (`habit_app_proposal.pdf`, `abhyas-architecture.pdf`):
  extracted the full feature set (habit CRUD, streak engine, Islamic features, gamification,
  social, notifications) and the proposed tech stack (React Native/Kotlin → adapted to Next.js PWA).
- **Architecture decision**: Delivered as a single-route (`/`) Next.js 16 PWA with a
  client-side view router (Home / Habits / Stats / Islamic / Profile), backed by Next.js
  API routes + Prisma/SQLite, with optimistic UI via TanStack Query and persisted settings
  via Zustand. Multi-user-ready schema; demo operates on a single local user.
- **Foundation**: Premium design tokens (emerald/teal palette per proposal, Bengali Noto
  Sans Bengali font, dark/light/system themes), PWA manifest + icon, Prisma schema
  (User, Habit, HabitCompletion, PrayerRecord, QuranSession, Achievement, PrayerTimeCache).
- **Core libs**: `date-bn` (Bengali numerals/dates), `streaks` (schedule-aware streak engine),
  `gamification` (XP/level curve), `prayer` (next-prayer/countdown), `api-client`, server
  helpers (`habits-server`, `badge-stats`, `user`).
- **Stores**: `ui-store` (view router + modals), `settings-store` (persisted theme/accent),
  `tasbih-store` (persisted counter).
- **API routes**: `/api/me` (GET/PUT), `/api/me/settings` (POST), `/api/habits` (GET/POST),
  `/api/habits/[id]` (PUT/DELETE), `/api/habits/[id]/toggle` (POST), `/api/prayer/times`
  (Aladhan API + DB cache), `/api/prayer/log` (GET/POST), `/api/quran` (GET/POST),
  `/api/stats` (aggregated dashboard), `/api/seed` (idempotent sample data).
- **UI**: Responsive shell (desktop sidebar nav + mobile bottom nav), top bar with level
  ring + XP, Home dashboard (progress ring + habits grouped by time-of-day), Habits view
  (search/filter + add/edit sheet + detail drawer with GitHub-style heatmap), Stats view
  (level card, 30-day bar chart, category pie, badges grid), Islamic view (prayer card with
  live Aladhan times, Quran tracker with khatm progress, dua library, tasbih counter),
  Profile (theme/accent/toggles/export/reset).
- **Race-safety fixes**: `getOrCreateUser` now uses `upsert` (was colliding on the fixed
  default-user id under concurrent requests); habit toggle + prayer log made idempotent
  against P2002 unique-constraint races.

### Stage Summary
- ✅ Lint passes clean (`bun run lint`).
- ✅ Dev server runs on port 3000, all API routes return 200.
- ✅ Agent-browser verified end-to-end (mobile + desktop viewports):
  - Home renders seeded habits grouped by সকাল/দুপুর/বিকাল/রাত.
  - Habit toggle awards XP (32→44) and updates streaks; no console/runtime errors.
  - Islamic view fetches real Aladhan prayer times for ঢাকা (Fajr 4:02 … Isha 8:03);
    prayer toggles + tasbih tap work.
  - Stats view renders charts + 6/15 badges earned from seeded history.
  - Profile view: theme toggle (dark mode), accent picker, toggles, export all functional.
  - Add-habit sheet creates habits (verified via API: 10 seed → 12 after test creates).
  - Habit detail drawer renders 6-month heatmap + milestones.
  - Desktop sidebar layout + mobile bottom nav both render responsively.
- No fresh errors in dev.log after race-safety fixes.

### Unresolved / Next-phase recommendations
- Add Service Worker for true offline PWA caching (currently offline-first via TanStack
  Query cache + localStorage settings; a full SW would enable install + offline boot).
- Real-time social features (leaderboard, friend challenges) via the WebSocket mini-service
  pattern — schema is ready, UI not yet built.
- AI coaching (z-ai-web-dev-sdk LLM) for personalized habit suggestions — Phase-2 feature.
- bKash/Nagad payment integration for premium tier — needs merchant credentials.
- Bangladesh calendar (Bengali New Year, Eid) special habit targets.

---

## Task ID: R1 (webDevReview Round 1 — Feature + Styling Expansion)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
Foundation stable. Lint clean, dev server healthy, all API routes 200, no runtime errors
after agent-browser QA on mobile + desktop. 14 habits in DB (10 seed + 4 test), XP 200.
The app is production-usable; this round focuses on expanding features and styling polish
per the mandatory directives ("more features", "more styling details").

### Work Log
- **Confetti celebration system** (`src/lib/confetti.ts` + `celebration.tsx`):
  zero-dependency canvas engine with gravity, rotation, multi-shape particles, staggered
  bursts. Wired into the toggle hook to fire on: streak milestones (7/14/30/100/365),
  level-ups, badge unlocks, and **perfect-day detection** (throttled once/day via
  localStorage so re-toggling doesn't re-fire).
- **AnimatedNumber component**: count-up animation with ease-out cubic + Bengali numeral
  formatting. Applied to Home hero percentage + Stats quick-stat cards for premium feel.
- **Onboarding flow** (`onboarding-modal.tsx`): 3-step first-run modal (welcome → pick
  starter habits from 8 curated presets → confirm) with progress bar, spring animations,
  and confetti on completion. Gated by localStorage so it shows only once. Wired into
  AppShell as a global overlay.
- **Weekly insights backend**: extended `/api/stats` to compute best weekday, best
  time-of-day, momentum delta (last-7-days vs previous-7-days completion rate), weekday
  distribution series, and time-of-day distribution series.
- **Weekly insights card** (`weekly-insights.tsx`): momentum hero (up/down/stable with
  trend icon + color), best-day + best-time insight cards, weekday bar chart with the
  best day highlighted in primary color. Inserted into Stats view.
- **Skeleton loaders**: Home + Stats views now show structured shimmer skeletons (hero +
  grid + cards) instead of plain spinners during load.
- **Styling polish**: ambient gradient-mesh body background (theme-aware, very subtle),
  `shimmer` CSS utility, card hover-lift micro-interactions on stat cards, detailed
  skeleton grids matching real layout.

### Verification results
- ✅ `bun run lint` clean.
- ✅ Dev server compiles, all routes 200, no console/runtime errors.
- ✅ agent-browser QA:
  - Onboarding modal renders on first visit (cleared flag), 3-step flow navigable,
    preset picker shows 8 habits with 4 pre-selected.
  - Stats view renders the new "সাপ্তাহিক অন্তর্দৃষ্টি" card; API returns real insights
    (bestWeekday: শনি/27, bestTime: রাত/53, momentum: স্থিতিশীল).
  - Habit toggle awards XP (171→200, +29 with streak bonus); confetti canvas mounts
    without errors.
  - Desktop sidebar + mobile bottom nav both render; ambient background visible.
- Screenshots saved: `qa-stats-after.png`, `qa-desktop-home.png`, `qa-desktop-after.png`.

### Unresolved / next-phase recommendations
- **Streak freeze mechanic**: schema field + UI to forgive 1 missed day/week
  (gamification depth — designed but not yet implemented this round).
- **Habit drag-and-drop reordering**: `@dnd-kit` is already installed; needs wiring to
  the Habits view + a reorder API endpoint.
- **Service Worker / true offline PWA**: still the top infra gap for the Bangladesh
  market (intermittent connectivity).
- **AI coaching**: use z-ai-web-dev-sdk LLM to generate personalized habit suggestions
  based on the user's completion patterns.
- **Social/leaderboard via WebSocket mini-service**: schema ready, UI + realtime layer TBD.

