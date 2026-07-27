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

---

## Task ID: R2 (webDevReview Round 2 — AI Coach + Streak Freeze + Drag-Reorder)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R1, the app was stable (lint clean, no runtime errors, all views functional).
This round delivered three flagship features from the next-phase roadmap plus styling
polish. All QA-verified via agent-browser on mobile + desktop with zero errors.

### Work Log
- **AI Coach feature** (flagship): new `/api/ai/coach` endpoint using `z-ai-web-dev-sdk`
  LLM. Sends a compact context summary (today's progress, active streaks, at-risk habits,
  weakest/strongest habits) to the LLM with a Bengali system prompt that returns
  structured JSON: `{encouragement, riskAlert, suggestions[]}`. Graceful deterministic
  fallback if the LLM is unavailable. New `AICoachPanel` component on the Home view with
  gradient styling, shimmer loading, animated suggestions, and a refresh button. Verified:
  LLM returned personalized Bengali coaching (11-day streak praise, risk alert for যোহর
  17-day + মাগরিব 9-day streaks, 3 specific suggestions).
- **Streak freeze mechanic**: new schema fields `frozenDate` + `freezeUsedWeek` on Habit.
  New `/api/habits/[id]/freeze` endpoint enforcing 1-freeze-per-ISO-week-per-habit rule.
  Streak engine (`computeCurrentStreak`) updated to treat `frozenDate` as a forgiven day
  (streak preserved). UI: snowflake button appears on at-risk habit rows (streak ≥ 3, not
  done today) on hover; "ফ্রিজ" badge on frozen habits; freeze button in habit detail
  drawer. Verified: যোহরের নামাজ frozen → streak preserved at 18 (would have broken).
- **Habit drag-and-drop reordering**: new `/api/habits/reorder` endpoint (transactional
  sortOrder update). New `SortableHabitsList` component using `@dnd-kit/core` +
  `@dnd-kit/sortable` with grip handles, grouped by time-of-day (each group independently
  sortable). Habits view has a "সাজান/সম্পন্ন" toggle button; reorder mode shows an
  instruction banner. Only enabled when filter is "all" and no search query. Verified:
  drag handles appear, instructions banner visible.
- **Styling polish**: violet gradient theme for AI Coach panel, sky-blue theme for freeze
  indicators, refined hover states, animated suggestion entrance (staggered), frozen
  habit row tinting, improved button states.

### Verification results
- ✅ `bun run lint` clean.
- ✅ Dev server compiles, all routes 200, no console/runtime errors.
- ✅ Prisma client regenerated after schema change (fixed initial P2002/Validation errors).
- ✅ agent-browser QA (mobile 390×844 + desktop 1280×800):
  - AI Coach panel renders on Home with LLM-generated personalized content.
  - `/api/ai/coach` returns structured JSON (encouragement + riskAlert + 3 suggestions).
  - Habits view: reorder toggle works, drag handles + instructions banner appear.
  - Streak freeze: API returns 200 with frozenDate + weekKey; frozen badge ("ফ্রিজ")
    displays on habit row; streak preserved (17→18 via freeze forgiveness).
  - Habit detail drawer: freeze button appears for at-risk habits.
  - Desktop layout: sidebar + AI Coach + hero all render correctly.
- Screenshots: `qa-r2-habits-frozen.png`, `qa-r2-desktop-home-coach.png`, `qa-r2-stats.png`,
  `qa-r2-islamic.png`.

### Unresolved / next-phase recommendations
- **Service Worker / true offline PWA**: still the top infra gap — app currently works
  offline via TanStack Query cache + localStorage, but a full SW would enable install +
  offline boot.
- **Social/leaderboard via WebSocket mini-service**: schema ready, needs UI + realtime layer.
- **Bangladesh calendar integration**: Bengali New Year (পহেলা বৈশাখ), Eid, national
  holidays as special habit targets.
- **Habit templates library**: pre-made habit bundles (e.g., "রমজান প্রস্তুতি", "ছাত্র
  রুটিন") that users can install in one tap.
- **Notifications**: browser notification API for habit reminders (settings toggles exist
  in Profile but aren't wired to actual notifications yet).

---

## Task ID: R3 (webDevReview Round 3 — PWA Offline + Templates + Notifications + a11y)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R2, the app was stable with 3 flagship features (AI Coach, streak freeze,
drag-reorder). QA via agent-browser surfaced 6 accessibility console warnings
(DialogContent missing Title/Description) — a real bug worth fixing. This round
fixed those + delivered the top three roadmap items: Service Worker (offline
PWA), Habit Templates Library, and Browser Notifications.

### Work Log
- **Accessibility fix (bug)**: onboarding modal's `DialogContent` lacked
  `DialogTitle`/`DialogDescription` (used motion headings). Added
  `VisuallyHidden`-wrapped title+description. Added `DialogDescription` to the
  Quran tracker dialog. Verified: a11y console warnings dropped 6 → 0 after
  fresh reload.
- **Service Worker / offline PWA**: new `public/sw.js` with three caching
  strategies — precache app shell, network-first for `/api/*` (fresh data
  online, cache fallback offline), stale-while-revalidate for same-origin
  assets. New `public/offline.html` Bengali fallback page. New
  `ServiceWorkerRegister` component (production-only, avoids HMR conflicts).
  Wired into AppShell.
- **Habit Templates Library**: new `TEMPLATE_BUNDLES` constant with 6 curated
  bundles (রমজান প্রস্তুতি, ছাত্র রুটিন, সকাল রুটিন, স্বাস্থ্য ও ফিটনেস, মানসিক
  সুস্থতা, উৎপাদনশীলতা) — 32 habits total. New `/api/habits/templates`
  endpoint installs a bundle's habits transactionally. New `TemplatesModal`
  component with browse → detail → install flow (animated, gradient-themed
  cards per bundle). New `LayoutGrid` button in Habits view header opens it.
  Verified: installed "সকাল রুটিন" → habits 25 → 30, no errors.
- **Browser Notifications**: new `useNotifications` hook wires the
  `notificationsEnabled` + `remindersEnabled` settings toggles to the browser
  Notification API. Requests permission when enabled, checks every 15 min for
  habits with `reminderTime` matching the current hour (not completed today,
  not yet notified today → fires OS notification with habit name + streak).
  Per-day localStorage dedup. New `TestNotificationButton` in Profile view
  (next to the notifications toggle) lets users verify permission + send a test.
- **Styling polish**: refined toggle row with optional `extra` slot, gradient
  bundle cards, animated bundle-detail habit list (staggered entrance).

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ a11y console warnings: 6 → 0 after fresh reload.
- ✅ agent-browser QA (mobile 390×844 + desktop 1280×800):
  - Templates modal: 6 bundles render, bundle detail shows habits, install
    works (25 → 30 habits, toast confirmation).
  - Profile: "পরীক্ষা" test-notification button renders next to toggle.
  - Desktop: AI Coach + hero + sidebar all render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r3-profile-notifications.png`, `qa-r3-desktop-home.png`.

### Unresolved / next-phase recommendations
- **SW in production only**: the SW registration is gated to
  `NODE_ENV === "production"` to avoid HMR conflicts; a production build test
  would confirm offline behavior end-to-end.
- **Social/leaderboard via WebSocket mini-service**: schema ready, needs UI +
  realtime layer — the last major feature gap.
- **Bangladesh calendar integration**: Bengali New Year (পহেলা বৈশাখ), Eid,
  national holidays as special habit targets.
- **Habit statistics depth**: monthly trend lines, year-over-year comparison,
  best-time-of-day heatmap.
- **Data sync**: server-side persistence of offline changes (currently the
  local SQLite is the single source of truth; a sync API would enable
  multi-device).

---

## Task ID: R4 (webDevReview Round 4 — Analytics + BD Calendar + CSV Export)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R3, the app was stable (lint clean, a11y fixed, PWA SW + templates +
notifications shipped). This round delivered the remaining analytics + cultural
features from the roadmap: 12-month trend chart, Bangladesh calendar panel,
and CSV export. All QA-verified via agent-browser on mobile + desktop.

### Work Log
- **12-month trend analytics**: extended `/api/stats` to compute a 12-month
  completion-rate series (`monthlyTrend[]` with done/scheduled/rate per month).
  New `MonthlyTrendChart` component — gradient-filled area chart with X-axis
  month labels (Bengali), Y-axis percentage, average-rate summary, and
  best-month stat. Inserted into Stats view after the 30-day bar chart.
  Verified: API returns 12 months (July shows 18% rate from seeded data).
- **Bangladesh calendar panel**: new `bangladesh-calendar.ts` constants with
  10 curated special days (Bengali: পহেলা বৈশাখ; Islamic: Eid ul-Fitr, Eid
  ul-Adha, Shab-e-Barat, Shab-e-Qadr, Ashura, Mawlid; National: Language
  Martyrs Day, Independence Day, Victory Day). New `/api/calendar` endpoint
  returns upcoming events within 60 days. New `CalendarPanel` component on the
  Home view with category-colored cards (amber=bengali, teal=islamic,
  rose=national), days-until countdown, and habit-theme suggestions.
  Verified: ঈদে মিলাদুন্নবী (40 days) renders on Home.
- **CSV export**: new `/api/export?format=csv` endpoint exports all habits +
  completion dates as a well-formed CSV (Bengali-escaped, semicolon-delimited
  date lists). Profile view now has two export rows: JSON + CSV. Verified:
  CSV downloads correctly with Bengali content (6KB, 30 rows).
- **Styling polish**: gradient area chart with defs, CartesianGrid, active
  dots; calendar cards with colored rings + emoji date tiles; category chips
  on calendar entries.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA (mobile 390×844 + desktop 1280×800):
  - Home: Calendar panel ("আসন্ন বিশেষ দিন") renders with ঈদে মিলাদুন্নবী.
  - Stats: Monthly trend chart ("বার্ষিক ধারা") renders with 12-month data.
  - Profile: CSV export button ("CSV") renders next to JSON export.
  - CSV API returns 200 with well-formed CSV (verified content).
  - Calendar API returns 1 upcoming day within 60 days.
  - Desktop: calendar + AI coach + hero all render correctly.
- Screenshots: `qa-r4-stats-with-trend.png`, `qa-r4-profile-csv.png`,
  `test-export.csv`.

### Unresolved / next-phase recommendations
- **Social/leaderboard via WebSocket mini-service**: the last major feature
  gap — schema ready, needs a socket.io mini-service + UI.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Habit statistics depth**: year-over-year comparison, best-time-of-day
  heatmap (the monthly trend is done; these would add more depth).
- **Production build test**: confirm the Service Worker offline behavior
  end-to-end in a production build.
- **Bangladesh calendar Hijri accuracy**: the Islamic dates are approximate;
  a proper Hijri→Gregorian conversion would make them exact per year.




