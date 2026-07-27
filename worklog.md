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
