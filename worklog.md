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

---

## Task ID: R5 (webDevReview Round 5 — Social/Leaderboard WebSocket Mini-Service)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R4, the app was stable with all prior features (habit tracking, Islamic,
gamification, AI coach, templates, PWA SW, notifications, analytics, BD
calendar, CSV export). The last major roadmap gap was the **social/leaderboard
via WebSocket mini-service** — this round delivered it in full.

### Work Log
- **WebSocket mini-service** (`mini-services/social/index.ts`): independent bun
  project on port 3003, socket.io server with `path: "/"`. Maintains an
  in-memory leaderboard seeded with 10 demo users (আরিফ, সাবরিনা, তানভীর… with
  XP/level/streak), plus a live activity feed (max 30 events). Emits periodic
  demo activity every 18s so the feed feels alive. Events: `join`, `activity`,
  `update-xp`, `leaderboard`, `presence`, `activity`.
- **Social hook** (`use-social.ts`): socket.io-client wrapper with auto-join,
  XP sync, and a custom-event bridge — habit toggles dispatch a
  `window.CustomEvent("abhyas-activity")` which the hook forwards to the
  socket. Critical fix: `path: "/"` + `transports: ["polling", "websocket"]`
  to work through the Caddy gateway (port 81). Connecting via port 3000
  directly fails because the gateway proxy is required for `XTransformPort`.
- **Social view** (`social-view.tsx`): global leaderboard with rank badges
  (gold/silver/bronze for top 3), your-rank hero card with crown for top-3,
  live activity feed with animated entries (completion/streak/levelup/join
  events), online-count indicator, connection status pill. Added "social" to
  the ViewKey type + nav config + view router.
- **Activity broadcasting**: the toggle hook now dispatches a custom DOM event
  on habit completion → the social hook forwards it to the socket → all
  connected clients see it in the live feed. Streak milestones broadcast as
  "streak" type; regular completions as "completion".

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Social mini-service running on port 3003 (verified via `mini-services/social.log`).
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Social view connects: "অতিথি joined (xp=268)" logged server-side.
  - Leaderboard renders with 10 demo users + your entry.
  - Live activity feed shows demo activities (আরিফ completed ফজরের নামাজ, etc.).
  - Habit toggle broadcasts: XP updated 268 → 285, reconnected with new XP.
  - Online count + connection status pill render correctly.
  - Desktop layout: sidebar nav includes সোশ্যাল tab.
- Screenshots: `qa-r5-social-connected.png`, `qa-r5-social-final.png`.

### Key technical note
The social WebSocket requires accessing the app through the Caddy gateway
(port 81), not directly via port 3000. The `XTransformPort=3003` query param
only works through Caddy's reverse proxy. The `path: "/"` setting on both
server and client is essential to avoid Next.js intercepting `/socket.io/`.

### Unresolved / next-phase recommendations
- **Habit notes/journal**: the toggle hook now supports activity broadcasting,
  but the habit notes feature (add note to a completion) was scoped out this
  round — schema field exists, UI not yet built.
- **Production build test**: confirm the Service Worker + social socket work
  end-to-end in a production build.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper
  Hijri→Gregorian conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages —
  the current social is global-only.

---

## Task ID: R6 (webDevReview Round 6 — Mood Tracking + Habit Notes/Journal)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R5, the app was stable with all major roadmap features shipped (habit
tracking, Islamic, gamification, AI coach, templates, PWA SW, notifications,
analytics, BD calendar, CSV export, social/leaderboard). This round added
emotional intelligence: daily mood tracking + habit notes/journal — a Phase-2
feature from the original proposal ("মুড ট্র্যাকিং").

### Work Log
- **Mood tracking backend**: new `MoodEntry` Prisma model (userId, date, mood
  1-5, note). New `/api/mood` endpoint (GET returns 30-day series + average +
  today's entry; POST upserts mood for a date). Extended `/api/stats` to
  include `mood.series`, `mood.average`, `mood.today`.
- **Mood selector UI** (`mood-selector.tsx`): 5-emoji mood picker on the Home
  view (😞😕😐🙂😄 with Bengali labels). Active mood gets a colored background
  matching the mood value. Shows average mood + entry count. Haptic feedback
  on selection. Verified: mood=4 (ভালো) saved → API returns `today.mood: 4`.
- **Mood trend chart** (`mood-trend-chart.tsx`): line chart on the Stats view
  showing 30-day mood trend with emoji Y-axis labels, average mood summary,
  and an empty state when no mood entries exist. Connected with `connectNulls`
  to handle gaps.
- **Habit notes/journal backend**: new `/api/habits/[id]/notes` endpoint
  (POST upserts a note on a completion; GET returns last 30 notes). The
  existing `note` field on `HabitCompletion` was already in the schema.
- **Habit notes UI**: `NotesSection` component in the habit detail drawer
  with a "+ নতুন নোট" button that expands a textarea, save/cancel buttons,
  and a timeline of past notes (date + relative time + note text, max 5 shown
  with "আরও N টি" overflow). Verified: note "আজ ভোরে উঠে নামাজ পড়তে পেরে
  ভালো লাগলো।" saved and displayed.
- **Styling polish**: mood-colored active states, animated note input
  expansion, border-left accent on note cards, emoji-based mood chart axis.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors (after restart to
  pick up Prisma client regeneration for MoodEntry).
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Home: MoodSelector renders with 5 emoji buttons; clicking "ভালো" saves
    mood=4 (verified via API: `today.mood: 4`).
  - Stats: Mood trend chart ("মুড ধারা") renders with the saved entry.
  - Habit detail: NotesSection renders with "+ নতুন নোট" button; adding a
    note saves it (verified via API: 1 note returned); note displays in the
    timeline.
  - Desktop: all Home features (AI Coach, Calendar, Mood, habits) render.
- Screenshots: `qa-r6-stats-mood.png`.

### Unresolved / next-phase recommendations
- **Journal timeline view**: a dedicated view combining all habit completions
  + notes + mood entries into a unified daily journal timeline (the notes UI
  exists per-habit, but a cross-habit journal view would be more powerful).
- **Production build test**: confirm SW + social socket + mood/notes work
  end-to-end in a production build.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper
  Hijri→Gregorian conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Mood-habit correlation**: analytics showing which habits correlate with
  better moods (e.g., "days you pray Fajr, your average mood is 4.2 vs 3.1").

---

## Task ID: R7 (webDevReview Round 7 — Journal Timeline + Mood-Habit Correlation)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R6, the app was stable with mood tracking + habit notes shipped. This
round delivered the two top R6 recommendations: a unified Journal timeline
view and mood-habit correlation analytics. All QA-verified via agent-browser
on mobile + desktop with zero errors.

### Work Log
- **Journal API** (`/api/journal?days=30`): unified timeline endpoint that
  merges mood entries + habit completions + notes into a per-day timeline.
  Only includes days with activity (mood or completions). Returns up to 60
  days. Verified: 14 days returned with today showing mood=4, 8 habits.
- **Journal view** (`journal-view.tsx`): new 7th nav tab ("জার্নাল" 📔).
  Premium timeline UI with a vertical line + colored mood dots, day cards
  showing mood emoji + label, mood notes, completed habits with icon tiles +
  notes, "নিখুঁত!" badge for 100% days, "আজ" highlight for today. Empty
  state when no entries. Animated entrance with staggered delays.
- **Mood-habit correlation** (backend): extended `/api/stats` to compute
  avg mood when a habit was done vs not done. Returns top 5 habits by mood
  impact (requires ≥2 mood entries with that habit done). Added
  `moodCorrelations` to the stats response.
- **Mood-habit correlation card** (`mood-correlation-card.tsx`): Stats view
  card showing each habit with dual progress bars (done vs not-done mood),
  emoji labels, sample size, and a colored impact-delta badge (+/-). Empty
  state when insufficient data. Insight footer.
- **Styling polish**: compacted bottom nav for 7 items (w-10 pills, 19px
  icons, 9px labels), timeline animations, correlation bar charts with
  gradient fills.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Journal view: renders with 14 days of activity; today's entry shows
    mood=4 (ভালো) + 8 completed habits; timeline dots + day cards visible.
  - Stats: mood-habit correlation card renders (empty state since only 1
    mood entry — requires ≥2 for correlation; correct behavior).
  - Bottom nav: all 7 items render compactly on mobile (390×844).
  - Desktop: sidebar shows all 7 nav items including Journal.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r7-journal.png`, `qa-r7-stats-correlation.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm SW + social socket + journal + mood
  correlation work end-to-end in a production build.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper
  Hijri→Gregorian conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Journal search/filter**: filter by habit, mood, or date range.
- **More mood data needed**: the correlation feature needs ≥2 mood entries
  per habit to show data — will populate naturally as the user logs moods.

---

## Task ID: R8 (webDevReview Round 8 — Focus/Pomodoro Timer)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R7, the app was stable with 7 views (Home/Habits/Stats/Islamic/Journal/
Social/Profile). This round added the **Focus/Pomodoro Timer** — a productivity
feature that lets users do deep-work sessions with configurable work/break
intervals, linked to habits, with session logging and stats. Fixed a lint error
(`react-hooks/immutability` — `handleComplete` used before declaration) that
was introduced mid-round.

### Work Log
- **FocusSession model**: new Prisma model (userId, habitId?, date, durationMin,
  type "work"|"break", completed). Pushed to DB.
- **Focus API** (`/api/focus`): GET returns 7-day sessions + today's minutes +
  total stats + daily series. POST logs a completed session. Verified: 25-min
  work session logged → todayMinutes=25, totalSessions=1.
- **Focus view** (`focus-view.tsx`): new 8th nav tab ("ফোকাস" 🎯). Premium
  Pomodoro timer UI with:
  - 3 presets (পোমোডোরো 25/5, গভীর কাজ 50/10, ছোট 15/3)
  - Work/Break mode toggle with color-coded theming (primary for work, amber for break)
  - Large circular timer with ProgressRing (200px, animated, glow when running)
  - Play/Pause/Reset controls with spring animations
  - Habit linking via Select dropdown (optional)
  - Today/week/session stats grid
  - Recent sessions list with habit names
  - Auto mode-switch on completion + toast notification + session logging
- **Bug fix**: moved `handleComplete` useCallback before the timer `useEffect`
  to resolve `react-hooks/immutability` error (variable used before declaration).
- **Bottom nav update**: made horizontally scrollable (`no-scrollbar` + `overflow-x-auto`)
  with `min-w-[3.25rem]` items to handle 8 tabs gracefully on mobile.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Focus view renders with 3 presets, mode toggle, circular timer.
  - Timer starts (Play button → "বিরতি" pause appears, countdown 25:00 → 24:46).
  - Focus API: POST logs session, GET returns correct stats.
  - All 8 nav items render compactly on mobile (390×844) with horizontal scroll.
  - Desktop sidebar shows all 8 nav items including Focus.
  - Full tour of all 8 views: no errors in dev.log.
- Screenshots: `qa-r8-focus-running.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm SW + social socket + focus timer work
  end-to-end in a production build.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper
  Hijri→Gregorian conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Journal search/filter**: filter by habit, mood, or date range.
- **Focus enhancements**: ambient sounds, custom intervals, focus streaks,
  integration with XP (award XP for focus sessions).

---

## Task ID: R9 (webDevReview Round 9 — Focus XP + Journal Search/Filter)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R8, the app was stable with 8 views including the new Focus/Pomodoro
timer. This round connected the Focus timer to the gamification system (XP
awards + level-ups) and added focus streaks, plus implemented journal
search/filter (a top R7 recommendation). All QA-verified via agent-browser.

### Work Log
- **Focus XP integration**: `/api/focus` POST now awards 2 XP per minute for
  completed work sessions (e.g., 25-min session → +50 XP). Updates the user's
  XP + level, returns `xpAwarded`, `totalXp`, `level`, `leveledUp`. The Focus
  view's `logSession` mutation handles XP toast feedback (regular XP toast +
  special level-up toast) and invalidates `["me"]` + `["stats"]` queries.
  Verified: 25-min session → +50 XP, totalXp 302→352.
- **Focus streak**: `/api/focus` GET now computes `focusStreak` — consecutive
  days (ending today or yesterday) with ≥1 work session. Added to the Focus
  view's stats grid as a 4th stat box with a Flame icon (streak-glow animation).
  Verified: focusStreak=1 after today's session.
- **Confetti on focus completion**: the timer's `handleComplete` now fires
  confetti (60 particles) on work-session completion, replacing the redundant
  toast (the logSession onSuccess now handles the XP toast).
- **Journal search/filter** (`journal-view.tsx`): added a search input
  (filters by habit name, habit note, or mood note) + mood filter chips
  (5 emoji-labeled chips: খুব খারাপ → খুব ভালো). Filter logic runs
  client-side via `useMemo`. Empty state differentiates "no entries" vs
  "no results found" (when a filter is active). Verified: searching "নামাজ"
  finds matching entries; mood filter chips work.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Focus view renders; XP API returns `xpAwarded=50, totalXp=352, leveledUp=false`.
  - Focus streak stat renders (focusStreak=1) with Flame icon.
  - Journal view: search input + mood filter chips render; search "নামাজ" finds
    results; mood filter chips toggle correctly.
  - Desktop: all 8 nav items render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r9-journal-filter.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, custom intervals, focus badges.
- **Weekly AI recap**: AI-generated weekly summary using z-ai-web-dev-sdk.

---

## Task ID: R10 (webDevReview Round 10 — Weekly AI Recap + Focus Daily Chart)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R9, the app was stable with 8 views, Focus XP integration, and journal
search/filter. This round delivered the **Weekly AI Recap** (a flagship LLM-
powered feature) and a **Focus daily chart**. All QA-verified via agent-browser.

### Work Log
- **Weekly AI Recap backend** (`/api/ai/recap`): uses `z-ai-web-dev-sdk` LLM to
  generate a structured weekly summary. Gathers: completion count/rate, avg
  mood, focus minutes, active streaks, best streak, prayers done, Quran pages,
  XP/level. LLM returns `{headline, highlights[], improvement, nextWeekFocus}`
  in Bengali. Graceful deterministic fallback if LLM unavailable. Verified: LLM
  returned personalized recap with specific numbers (58 completions, 14 prayers,
  28% rate, 210 scheduled).
- **WeeklyRecapCard** (`weekly-recap-card.tsx`): collapsible card on the Home
  view with violet gradient theme, Sparkles icon, refresh button. Shows:
  headline (emerald box), highlights (✓ list with staggered animation),
  improvement (amber box with 📈), next-week focus (violet box with Target icon).
  Loading shimmer state. Verified: renders with AI content on Home.
- **FocusDailyChart** (`focus-daily-chart.tsx`): 7-day focus minutes bar chart on
  the Focus view. Bengali weekday labels (রবি/সোম/মঙ্গল...), colored bars
  (primary for active days, muted for zero days), total minutes summary.
  Inserted between the stats grid and recent sessions.
- **Styling polish**: violet gradient theme for recap card, staggered highlight
  animations, colored insight boxes (emerald/amber/violet), chart with
  weekday labels.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Home: WeeklyRecapCard renders with AI-generated content (headline +
    highlights + improvement + nextWeekFocus).
  - Focus: daily chart ("দৈনিক ফোকাস") renders with 7-day data.
  - Recap API returns structured Bengali JSON with specific metrics.
  - Desktop: all features render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r10-home-recap.png`, `qa-r10-focus-chart.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, custom intervals, focus badges.
- **Habit sharing**: share habit progress cards to social media (WhatsApp/FB).

---

## Task ID: R11 (webDevReview Round 11 — Habit Sharing + Badge Progress)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R10, the app was stable with 8 views, Weekly AI Recap, and Focus daily
chart. This round delivered **Habit Sharing** (WhatsApp + clipboard) and
**Badge Progress indicators** on the Stats view. All QA-verified.

### Work Log
- **Share backend** (`/api/habits/[id]/share`): generates a formatted Bengali
  text summary with habit stats (current streak, best streak, total done,
  completion rate, Islamic flag). Returns `{text, stats}`. Verified: API
  returns 230-char text with correct stats.
- **ShareButton + modal** (`share-button.tsx`): share button added to the habit
  detail drawer header. Opens a modal with a preview card (gradient bg, 4-stat
  grid: streak/best/done/rate), share text preview, and two actions: WhatsApp
  (opens wa.me deep link) + Copy to clipboard. Verified: modal opens, WhatsApp
  + copy buttons work.
- **Badge progress indicators** (Stats view): locked badges now show a progress
  bar + percentage based on `badgeStats` (e.g., streak_7 shows X/7 days, level_5
  shows X/5 levels). Added `getBadgeProgress()` function mapping each badge ID
  to its relevant stat + threshold. `BadgeTile` now accepts a `progress` prop.
  Added `badgeStats` to the StatsResponse type. Verified: progress bars render
  on locked badges.
- **Styling polish**: share card with gradient + 4-stat grid, badge progress
  bars with percentage labels, refined locked-badge opacity.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Habit detail: share button renders, modal opens with preview card +
    WhatsApp + copy buttons.
  - Share API: returns 230-char formatted text with correct stats.
  - Stats: badge progress bars render on locked badges with percentages.
  - Desktop: all nav items render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r11-stats-badges.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, custom intervals, focus badges.
- **Image-based sharing**: generate a PNG image of the share card (not just text).

---

## Task ID: R12 (webDevReview Round 12 — Custom Focus Intervals + Focus Badges)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R11, the app was stable with habit sharing + badge progress. This round
delivered **Custom Focus Intervals** (user-configurable work/break durations)
and **Focus Badges** (gamification for focus sessions). All QA-verified.

### Work Log
- **Custom focus intervals**: added a 4th preset button "⚙️ কাস্টম" that opens
  an animated interval picker with two number inputs (work 1-180 min, break
  0-60 min). Custom interval persists in localStorage (`abhyas-focus-custom`).
  When the custom preset is active, the timer uses the custom durations.
  Verified: picker opens, inputs work, custom button shows current values.
- **Focus badges**: added 2 new badges to the BADGES constant — "ফোকাস শুরু"
  (🎯 bronze, first focus session) and "ফোকাস মাস্টার" (🧠 gold, 50+ sessions).
  These appear on the Stats view badge grid with progress bars (using the
  existing `getBadgeProgress` function).
- **Styling polish**: custom interval picker with animated entrance, ⚙️ emoji
  on the custom button, refined preset selector (4 buttons), custom durations
  displayed on the button when active.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Focus view: custom preset button renders, clicking opens the picker with
    work/break inputs, "প্রয়োগ করুন" button applies the custom interval.
  - Desktop: all nav items render correctly.
  - No console errors (429 LLM rate-limit on AI recap is expected, not a bug).
- Screenshots: `qa-r12-focus-custom.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.
- **AI recap rate limiting**: the LLM 429 errors suggest adding a client-side
  cooldown or caching the recap for longer.

---

## Task ID: R13 (webDevReview Round 13 — AI Recap Cooldown + Category Analytics)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R12, the app was stable with custom focus intervals + focus badges.
This round fixed the **AI recap rate limiting** (429 errors from R12) and
enhanced **Category Analytics** with per-category completion progress bars.
All QA-verified.

### Work Log
- **AI recap cooldown fix**: added a 30-minute client-side cooldown to the
  WeeklyRecapCard. The refresh button is disabled during cooldown and shows a
  countdown timer ("৩০মি"). Last-fetch timestamp persisted in localStorage
  (`abhyas-recap-last-fetch`). The query function now catches errors and returns
  a graceful fallback recap instead of throwing. `retry: 0` prevents automatic
  retries on 429. `staleTime` increased to 30 min. Verified: recap loads
  (from LLM or fallback), no 429 errors in dev.log.
- **Category analytics enhancement**: the Stats view's category breakdown now
  shows per-category today's completion rate with a colored progress bar
  (using the category's theme color). Each category row shows `done/total`
  (e.g., "৩/৫") + a progress bar. Verified: progress bars render with correct
  colors and rates.
- **Styling polish**: recap refresh button now shows cooldown countdown,
  category rows have progress bars with category-colored fills.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Home: recap card loads (LLM or fallback), no 429 errors.
  - Stats: category analytics card renders with per-category progress bars.
  - Desktop: all features render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r13-stats-category.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.

---

## Task ID: R14 (webDevReview Round 14 — Yearly Heatmap)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
After R13, the app was stable with AI recap cooldown + category analytics. This
round added a **GitHub-style 365-day yearly heatmap** to the Stats view, showing
combined habit completion density across the entire year. All QA-verified.

### Work Log
- **Backend**: extended `/api/stats` to fetch completions for the full year
  (365 days instead of just 30). Added `yearlyHeatmap` array to the response —
  each entry is `{date, count}` representing the number of habit completions on
  that day. Verified: API returns 365 days, 22 active days, today=6 completions.
- **YearlyHeatmap component** (`yearly-heatmap.tsx`): GitHub-style 365-day
  calendar grid. Columns = weeks (52), rows = 7 days. Each cell is colored by
  completion density (0 = muted, increasing primary-color opacity for higher
  counts). Bengali month labels across the top. Color legend (কম → বেশি) at the
  bottom. Active-days + total-completions summary header. Horizontally scrollable
  on mobile. Hover tooltip shows date + count. Inserted into Stats view after
  the weekly insights card.
- **Styling polish**: color-mix for intensity shading, 11px cells with 2px gaps,
  rounded corners, hover ring, month labels, legend.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Stats: yearly heatmap ("বার্ষিক কার্যকলাপ") renders with 365 days.
  - API: returns 365 days, 22 active days, today=6 completions.
  - Desktop: all features render correctly.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r14-yearly-heatmap.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.
- **Heatmap interactivity**: click a cell to see that day's details (habits, mood, notes).

---

## Task ID: R15 (webDevReview Round 15 — Heatmap Interactivity + Git Workflow)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
This round introduced the mandatory git workflow: cleared sandbox, pushed 14
rounds of work to GitHub as backup, then cloned fresh. After clone, the app was
fully stable (DB seeded, all 8 views functional, no errors). This round then
delivered **Yearly Heatmap Interactivity** — clicking a heatmap cell opens a
day-detail popover showing that day's habit completions, mood, focus time, and
notes. All QA-verified and pushed to GitHub.

### Work Log
- **Git workflow**: backed up 14 rounds of work to GitHub (force push), cleared
  sandbox, cloned from `github.com/sharif418/abhyas.git`. Installed deps,
  pushed Prisma schema, started dev server + social service. Verified all data
  persisted (DB already seeded).
- **Day detail API** (`/api/day?date=YYYY-MM-DD`): fetches all activity for a
  specific day — habit completions (with habit details: name, icon, color,
  category, note), mood entry, and focus sessions (total minutes + count).
  Verified: 2026-07-27 returns 6 completions, mood=4, 50 focus minutes.
- **Heatmap interactivity**: yearly heatmap cells are now clickable buttons.
  Clicking a cell opens a `DayDetailPopover` — a full-screen modal overlay with:
  - Date header (Bengali day-first format)
  - Mood display (emoji + label + note)
  - Focus summary (minutes + session count)
  - Completed habits list (icon tiles + name + notes + ✓)
  - Empty state when no activity
  - Close button + click-outside-to-close
  - Loading shimmer state
  - Selected cell highlighted with outline ring
- **Styling polish**: clickable cells with hover ring, selected-cell outline,
  modal with backdrop blur, animated entrance/exit, icon tiles in popover.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA via Caddy gateway (port 81):
  - Stats: yearly heatmap renders, cells are clickable.
  - Day API: returns correct data (6 completions, mood=4, 50min focus).
  - No console errors / no dev.log errors.
- ✅ Git: committed and pushed to GitHub (`d746a77`).
- Screenshots: `qa-r15-heatmap.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.














---

## Task ID: R16 (Autonomous Agent — UI/UX Bug Fixes + Git Workflow)
**Agent**: Z.ai Code (Autonomous Execution Mode)

### Current project status (assessment)
Cloned fresh from GitHub (15 rounds of work). App was stable with 8 views.
This round fixed reported UI/UX flaws: Appearance section title/overflow,
Add New Habit modal cut-off, and Habit Detail sheet layout. All QA-verified.

### Work Log
- **Git workflow**: cleared sandbox, cloned from GitHub, installed deps,
  pushed Prisma schema, started dev + social servers. All data persisted.
- **Appearance section fix** (Profile view): the section title was " appearance"
  (English with leading space) — changed to "রূপ ও থিম" (Bengali). Changed
  Section component from `overflow-hidden` to `overflow-visible` to prevent
  content clipping (accent color picker, theme buttons).
- **Add New Habit modal fix** (habit-form.tsx): the sheet was getting cut off
  at the bottom because `HabitFormBody` returned a React fragment (`<>`)
  which doesn't participate in flex layout. Fixed by:
  - Wrapping the body in `<div className="flex flex-1 flex-col min-h-0 overflow-hidden">`
  - Adding `shrink-0` to SheetHeader and SheetFooter
  - Adding `min-h-0` to ScrollArea (critical for flex scrolling)
  - Adding `max-h-[100dvh]` to SheetContent
  Verified: footer ("যোগ করুন" + "বাতিল") is now fully visible.
- **Habit Detail sheet fix** (habit-detail.tsx): same fragment→div fix applied.
  Changed `<>` to `<div className="flex flex-1 flex-col min-h-0 overflow-hidden">`,
  added `shrink-0` to SheetHeader, `min-h-0` to the scroll container,
  `max-h-[100dvh]` to SheetContent.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA:
  - Habit form: opens, footer visible ("যোগ করুন" + "বাতিল" accessible).
  - Profile: Appearance section shows "রূপ ও থিম" (Bengali), no overflow.
  - No console errors / no dev.log errors.
- Screenshots: `qa-r16-habit-form-fixed.png`, `qa-r16-profile-appearance.png`.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.

---

## Task ID: R17 (webDevReview — Sound Effects + Git Workflow)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
Cloned fresh from GitHub (16 rounds of work). Fixed a stale Turbopack cache
issue in habit-detail.tsx. App was stable across all 8 views. This round added
a **premium sound effects system** using the Web Audio API — no external files
needed. Sounds fire on habit completion, streak milestones, level-ups, badge
unlocks, and perfect days, respecting the user's sound setting.

### Work Log
- **Git workflow**: cleared sandbox, cloned from GitHub, installed deps,
  pushed Prisma schema, started dev + social servers.
- **Sound effects system** (`src/lib/sounds.ts`): zero-dependency Web Audio API
  implementation with 4 distinct sounds:
  - `playCompletionSound()`: rising two-note chime (C5 → G5)
  - `playStreakSound()`: triumphant three-note arpeggio (C5 → E5 → G5)
  - `playLevelUpSound()`: celebratory four-note fanfare (C5 → E5 → G5 → C6)
  - `playPerfectDaySound()`: warm three-note chord (C5 + E5 + G5 simultaneously)
  Each tone uses envelope shaping (quick attack, exponential decay) for a
  premium feel. AudioContext auto-resumes if suspended (autoplay policy).
- **Integration**: wired into `useToggleHabit`'s onSuccess handler. Respects
  the user's `sound` setting from the settings store. Sounds fire alongside
  existing confetti + toast feedback. Verified: toggle works, no errors.
- **Stale cache fix**: cleared `.next` directory to resolve a stale Turbopack
  cache showing a non-existent parse error in habit-detail.tsx.

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA: habit toggle works, no console errors.
- ✅ Git: committed and pushed to GitHub.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus enhancements**: ambient sounds, focus streak freeze, focus session tags.
- **Image-based sharing**: generate a PNG image of the share card.

---

## Task ID: R18 (webDevReview — Focus Session Tags + Git Workflow)
**Agent**: Z.ai Code (webDevReview cron)

### Current project status (assessment)
Cloned fresh from GitHub (17 rounds of work). App was stable across all 8 views.
This round added **Focus Session Tags** — users can tag each focus session with
a topic (e.g., "পড়াশোনা", "কোডিং") for better organization and tracking.

### Work Log
- **Git workflow**: cleared sandbox, cloned from GitHub, installed deps,
  pushed Prisma schema, started dev + social servers.
- **FocusSession schema**: added `tag` field (optional String) to the
  FocusSession Prisma model. Pushed schema, regenerated Prisma client.
- **Focus API**: updated `/api/focus` POST to accept and save the `tag` field.
  Updated the LogSchema with `tag: z.string().max(60).nullable().optional()`.
  Verified: API saves tag correctly (tested with "study" → returned in GET).
- **Focus view UI**: added a tag input field below the habit linking section.
  Tag is cleared after each work session. Tags display in the recent sessions
  list as violet-colored chips (#tag). The `handleComplete` useCallback now
  includes `sessionTag` in its dependencies (fixed React Compiler error).
- **Styling polish**: tag chips with violet theme, input with placeholder
  examples ("যেমন: পড়াশোনা, কোডিং, লেখা...").

### Verification results
- ✅ `bun run lint` clean (0 errors, 0 warnings).
- ✅ Dev server compiles, all routes 200, no runtime errors.
- ✅ agent-browser QA: Focus view shows tag input, sessions list shows tag chips.
- ✅ Focus API: POST with tag saves correctly, GET returns tag in session data.
- ✅ Git: committed and pushed to GitHub.

### Unresolved / next-phase recommendations
- **Production build test**: confirm all features work end-to-end in production.
- **Data sync / multi-device**: server-side persistence of offline changes.
- **Bangladesh calendar Hijri accuracy**: approximate dates need proper conversion.
- **Social depth**: friend challenges, group leaderboards, direct messages.
- **Focus tag analytics**: show which tags get the most focus time.
- **Image-based sharing**: generate a PNG image of the share card.

---

## Task ID: R19 (CTO + UI/UX Audit Fixes)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- Timezone bug: Intl.DateTimeFormat with Asia/Dhaka
- next.config: ignoreBuildErrors=false, reactStrictMode=true
- Error boundaries: error.tsx, global-error.tsx, not-found.tsx
- Soft delete habits (active=false instead of delete)
- Prisma logging gated to dev only
- Home reordered: habits after hero, AI panels below
- H1 emojis stripped (4 views)
- Times-of-day emojis → lucide icons
- TopBar greeting emoji removed

### Verified
- Lint clean, no runtime errors
- Habits appear before AI panel on Home
- All H1 titles emoji-free

### Next priorities
- Auth system (NextAuth)
- Bottom nav reduce to 5 tabs
- Mood/badge emoji → SVG/icons
- Stats tab navigation
- Zod enum validation
- Stats endpoint N+1 fix

---

## Task ID: R20 (Bottom Nav 5-tab + Emoji→Icon Cleanup)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- Bottom nav reduced from 8 tabs to 5 (হোম/অভ্যাস/ফোকাস/পরিসংখ্যান/আরও)
- "More" dropdown menu for secondary views (ইসলামিক/জার্নাল/সোশ্যাল/প্রোফাইল)
- Sidebar updated with separator between primary/secondary items
- Mood selector: emoji faces → lucide icons (Frown/Meh/Smile/Laugh)
- Badges: all emoji icons → lucide icon names (Flame/Trophy/Crown/Star/Gem/Target/Brain/etc)
- BadgeTile: uses IconRenderer with Lock icon for unearned badges
- TopBar "💡" removed from sidebar tip
- "✓" removed from mood saved confirmation

### Verified
- Lint clean, no runtime errors
- 5-tab bottom nav works on mobile
- More menu opens, navigates to secondary views
- Mood selector renders with lucide icons
- Badges render with IconRenderer

### Next priorities
- Card header unification (Prayer/Tasbih/Quran/Dua → IconTile pattern)
- Stats view tab navigation (8 cards → 4 tabs)
- Auth system (NextAuth)
- Zod enum validation

---

## Task ID: R21 (Card Header Unification + Stats Tab Navigation)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- Card headers unified to IconTile pattern:
  - Prayer card: 🕌 → Moon icon in islamic-tinted tile
  - Tasbih counter: 📿 → RotateCw icon in islamic-tinted tile
  - Quran tracker: 📖 → BookOpen icon in islamic-tinted tile
  - Dua library: 🤲 → HeartHandshake icon in islamic-tinted tile
  - Calendar panel: 📅 → CalendarDays icon in primary-tinted tile
  - Mood selector: 💭 → Smile icon in primary-tinted tile
- Stats view: 8+ cards split into 4 tabs (সারসংক্ষেপ/ধারা/মুড/ব্যাজ)
  - Overview: Weekly insights + Category breakdown
  - Trends: Yearly heatmap + 30-day chart + Monthly trend
  - Mood: Mood trend chart + Mood-habit correlation
  - Badges: Badge grid with progress bars
  - Segmented control with pill-style tab switching
  - Removed duplicate category breakdown block

### Verified
- Lint clean, no runtime errors
- Stats tabs render and switch correctly
- All card headers use IconTile pattern (no emoji)
- GitHub committed and pushed

### Next priorities
- Auth system (NextAuth)
- Zod enum validation
- Stats endpoint N+1 fix
- Remaining emoji cleanup (onboarding, share card, social activity)

---

## Task ID: R22 (Final Emoji Cleanup + Activity Icons)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- Social activity feed: emoji icons → ActivityIcon component with semantic lucide icons (CheckCircle2/Flame/Star/UserPlus) in tinted tiles
- Social footer: 🌟 removed
- Islamic footer: 💚 removed
- Focus custom preset: ⚙️ removed
- Profile footer: 💚 removed
- Onboarding modal: 👋🔥🕌🏆🎯🚀 emojis → lucide icons (Flame/Moon/Trophy/Target)
- Onboarding Feature component: emoji props → icon props with IconRenderer
- Share card: 📚🔥🏆✅📊 → IconRenderer (BookOpen/Flame/Trophy/CheckCircle2/BarChart3)
- Share card stat tiles: now use flex+gap layout with icon+number

### Verified
- Lint clean, no runtime errors
- Social feed renders with lucide activity icons
- All major emoji-as-UI eliminated across the app
- GitHub committed and pushed

### Next priorities
- Auth system (NextAuth)
- Zod enum validation
- Stats endpoint N+1 fix
- Remaining inline emojis in copy text (journal notes, etc.)

---

## Task ID: R23 (Zod Enum Validation + Final Inline Emoji Cleanup)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Zod enum validation** (CTO audit H2):
  - `habits/route.ts` POST: category → `z.enum(CATEGORIES)`, frequency → `z.enum(FREQUENCIES)`, timeOfDay → `z.enum(TIMES_OF_DAY)`, color → `z.string().regex(HEX_COLOR)`, reminderTime → `z.string().regex(TIME_FORMAT)`, frequencyDays → `z.array(z.number().int().min(0).max(6))`, timesPerWeek → `z.number().int().min(0).max(7)`
  - `habits/[id]/route.ts` PUT: same enums applied to all optional fields
  - `me/settings/route.ts`: accent → `z.string().regex(HEX_COLOR)` (prevents CSS injection)
  - Verified: invalid category "INVALID" + invalid color "not-a-color" → rejected with 400
- **Inline emoji cleanup** (journal + heatmap):
  - Journal: "✨ নিখুঁত!" → "নিখুঁত!", "💭 {note}" → "{note}", "📝 {note}" → "{note}"
  - Yearly heatmap popover: "📝 {note}" → "{note}"

### Verified
- Lint clean, no runtime errors
- Zod validation rejects invalid inputs (tested with curl)
- App renders correctly with no console errors
- GitHub committed and pushed

### Next priorities
- Auth system (NextAuth) — the last critical CTO audit item
- Stats endpoint N+1 fix
- Production build test

---

## Task ID: R24 (Stats N+1 Fix + Security Headers)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Stats endpoint N+1 fix** (CTO audit H3):
  - Eliminated `computeBadgeStats()` call that made 4 redundant DB queries
  - Added `computeBadgeStatsInMemory()` — reuses already-fetched habits, completions, prayer, and quran data
  - Reordered prayer + quran queries before badge stats computation
  - Verified: badgeStats returns correct values (163 completions, 18 bestStreak, 31 habits)
- **Security headers** (CTO audit M2):
  - Added `X-Frame-Options: DENY` (clickjacking prevention)
  - Added `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  - Added `Referrer-Policy: strict-origin-when-cross-origin`
  - Added `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - Added `X-DNS-Prefetch-Control: on`

### Verified
- Lint clean, no runtime errors
- Stats API returns correct badge stats from in-memory computation
- App renders correctly
- GitHub committed and pushed

### Next priorities
- Auth system (NextAuth) — the last critical CTO audit item
- Production build test
- Stats endpoint: consolidate getHabitsWithMeta + completions fetch

---

## Task ID: R25 (Loading + Error States)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Root loading state** (CTO audit C5): new `loading.tsx` — branded skeleton with animated "অ" logo during initial route load
- **Home error state**: added `isError` branch with WifiOff icon, error message, and retry button
- **Stats error state**: same error UI pattern with Bengali messaging and retry CTA
- Both views now have proper 3-state UI: loading → error → data (previously: loading → data with silent permanent skeleton on error)

### Verified
- Lint clean, no runtime errors
- App renders correctly
- GitHub committed and pushed

### Next priorities
- Auth system (NextAuth)
- Production build test
- Consolidate getHabitsWithMeta + completions fetch

---

## Task ID: R26 (NextAuth Authentication + Focus Error State)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **NextAuth authentication system** (CTO audit C1 — the last critical item):
  - Added `passwordHash` field to User Prisma schema (bcrypt hash, nullable)
  - Created NextAuth config with Credentials provider (email/password, bcrypt verification)
  - JWT-based sessions (30-day maxAge), custom callbacks to inject user ID
  - `/api/auth/register` endpoint: name + email + password + city, bcrypt hash, duplicate email check (409)
  - `/api/auth/[...nextauth]` route: handles login/logout/session
  - `/login` page: Bengali login/register toggle, form validation, auto-login after register, guest access link
  - SessionProvider added to root Providers component
  - `getOrCreateUser()` updated: reads NextAuth session first, falls back to `local-default-user` for guest mode
  - Profile view: new "অ্যাকাউন্ট" section with login/logout buttons, shows session email when authenticated
  - `.env`: added NEXTAUTH_SECRET + NEXTAUTH_URL
  - Verified: register creates user (200), duplicate rejected (409), login page renders, guest fallback works
- **Focus view error state**: added `isError` branch with fallback message for focus data load failure

### Architecture
- Backward compatible: existing guest data (local-default-user) is preserved
- New users register → get their own user ID → all data scoped to their account
- Guest users can continue without login (data stays on local-default-user)
- All API routes automatically use the session user ID via `getOrCreateUser()`

### Verified
- Lint clean, no runtime errors
- Register API: creates user (200), rejects duplicates (409)
- Login page: renders with Bengali login/register toggle
- Guest fallback: app works without login (local-default-user)
- Home renders correctly
- GitHub committed and pushed

### Next priorities
- Production build test
- Consolidate getHabitsWithMeta + completions fetch
- Offline write queue (Service Worker background sync)
- Real push notifications (Web Push API + VAPID)

---

## Task ID: R27 (Habits Quick Stats + Styling Polish)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Habits view quick stats card**: 3-column grid showing active streaks (Flame icon), today's completion rate (TrendingUp icon, X/Y format), and best streak (Target icon). Hidden in reorder mode. Uses semantic colors (streak=amber, primary=emerald, violet=best).
- **Fixed duplicate button block**: removed accidental duplication of the reorder button that was introduced during editing.
- **IconRenderer import**: added to habits-view.tsx for future icon usage.

### Verified
- Lint clean, no runtime errors
- Quick stats card renders with correct values
- App stable across all views
- GitHub committed and pushed

### Next priorities
- Production build test
- Consolidate getHabitsWithMeta + completions fetch
- Offline write queue (Service Worker background sync)
- Real push notifications (Web Push API + VAPID)

---

## Task ID: R28 (Top Streaks Mini-Leaderboard on Habits View)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Top Streaks mini-leaderboard**: new section on the Habits view showing the top 5 habits with the longest active streaks. Features:
  - Horizontally scrollable chips (no-scrollbar)
  - Medal-colored rank badges (gold/silver/bronze for top 3, muted for rest)
  - Each chip shows: rank badge + habit name + flame icon + streak count
  - Clicking a chip opens the habit detail drawer
  - Only shows when at least 1 habit has an active streak
  - Hidden in reorder mode
- **Styling polish**: improved spacing between quick stats and top streaks section, wrapped both in a fragment for cleaner JSX

### Verified
- Lint clean, no runtime errors
- Top streaks section renders with correct data
- Clicking a streak chip opens habit detail
- GitHub committed and pushed

### Next priorities
- Production build test
- Consolidate getHabitsWithMeta + completions fetch
- Offline write queue (Service Worker background sync)
- Real push notifications (Web Push API + VAPID)

---

## Task ID: R29 (Habit Row Mini Progress Bar)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Habit row mini progress bar**: replaced plain text percentage with a visual mini progress bar + percentage. Each habit row now shows:
  - A 12px-wide colored progress bar (using the habit's own color) showing 30-day completion rate
  - The percentage number next to the bar
  - Smooth transition animation on width change
- This gives users instant visual feedback on their consistency at a glance, without needing to open the detail drawer

### Verified
- Lint clean, no runtime errors
- Habit rows render with mini progress bars
- App stable across all views
- GitHub committed and pushed

### Next priorities
- Production build test
- Consolidate getHabitsWithMeta + completions fetch
- Offline write queue (Service Worker background sync)
- Real push notifications (Web Push API + VAPID)

---

## Task ID: R30 (Daily Motivation Quote Card)
**Agent**: Z.ai Code (Autonomous)

### New Feature
- **Daily Motivation Quote Card** on Home view:
  - 30 curated Bengali motivational quotes in `constants/daily-quotes.ts`
  - Rotates daily based on day-of-year modulo list length
  - Premium card design: gradient accent, quote icon, "আজকের অনুপ্রেরণা" label
  - No emojis — uses SVG quote icon in a primary-tinted tile
  - Shows quote text + author attribution
  - Positioned at the top of the secondary panels section

### Verified
- Lint clean, no runtime errors
- Quote card renders with correct daily quote
- GitHub committed and pushed

### Next priorities
- Production build test
- Consolidate getHabitsWithMeta + completions fetch
- Offline write queue (Service Worker background sync)
- Real push notifications (Web Push API + VAPID)

---

## Task ID: R31 (Query Consolidation + Offline Write Queue)
**Agent**: Z.ai Code (Autonomous)

### Fixes Applied
- **Consolidated getHabitsWithMeta + completions fetch** (CTO audit H3):
  - New `getHabitsAndCompletions()` function returns both `habits: HabitWithMeta[]` and `rawCompletions: { habitId, date }[]` in a single DB pass
  - `getHabitsWithMeta()` now delegates to `getHabitsAndCompletions()` (backward compatible)
  - Stats endpoint uses `getHabitsAndCompletions()` and reuses `rawCompletions` instead of re-querying the DB
  - Eliminates 1 redundant DB query per stats request
  - Verified: stats API returns correct data (31 habits, 365 heatmap days, 164 completions)

- **Offline write queue (Service Worker Background Sync)**:
  - SW now intercepts POST requests to `/api/habits/*/toggle`
  - When online: passes through normally
  - When offline: queues mutation in IndexedDB, registers for Background Sync, returns synthetic success (so optimistic UI doesn't roll back)
  - `sync` event listener: processes queued mutations when connectivity restores
  - Notifies all clients via `postMessage` when sync completes
  - IndexedDB store: `abhyas-mutation-queue` → `mutations` (auto-increment key)
  - Note: Background Sync API only works in production (SW registered in production mode)

### Verified
- Lint clean, no runtime errors
- Stats API returns correct data with consolidated query
- App renders correctly
- GitHub committed and pushed

### Next priorities
- Production build test
- Real push notifications (Web Push API + VAPID)
- Account migration: move guest data to authenticated user on first login

---

## Task ID: R32 (Guest Data Migration)
**Agent**: Z.ai Code (Autonomous)

### New Feature
- **Guest data migration** (`/api/auth/migrate`):
  - When a guest user (local-default-user) logs in or registers, their data is migrated to the new authenticated account
  - Migrates: habits (with new IDs), completions, prayer records, quran sessions, achievements, mood entries, focus sessions
  - Transfers XP, level, city, and settings from guest to new user
  - Idempotent: skips if target user already has data or guest has no data
  - All in a single transaction for atomicity
  - Habit ID mapping maintained so completions link to new habit IDs
  - Login page: calls migrate API after successful login/register (best-effort, doesn't block login)

### Verified
- Lint clean, no runtime errors
- Login page renders correctly
- App stable
- GitHub committed and pushed

### Next priorities
- Production build test
- Real push notifications (Web Push API + VAPID)
- ESLint rule cleanup (CTO audit C3)

---

## Task ID: R33 (Habit Archive + Restore)
**Agent**: Z.ai Code (Autonomous)

### New Feature
- **Habit archive API** (`/api/habits/archive`):
  - GET: lists all soft-deleted (active=false) habits
  - POST: restores an archived habit (sets active=true)
- **Archive section in Profile view**:
  - Collapsible "আর্কাইভ" section with Archive icon
  - Shows "মুছে ফেলা অভ্যাসসমূহ" header with expand/collapse
  - Lists archived habits with icon tile, name (dimmed), best streak
  - "ফিরিয়ে আনুন" (restore) button per habit
  - Empty state: "কোনো আর্কাইভ করা অভ্যাস নেই"
  - Lazy fetches archive data only when expanded (enabled: false on useQuery)

### Verified
- Lint clean, no runtime errors
- Archive section renders in Profile view
- GitHub committed and pushed

### Next priorities
- Production build test
- Real push notifications (Web Push API + VAPID)
- ESLint rule cleanup (CTO audit C3)

---

## Task ID: PROD (Production Deployment Preparation — PostgreSQL + Docker)
**Agent**: Z.ai Code (CTO / Cloud Systems Architect)

### Architecture Analysis
Deep analysis of the codebase revealed:
- **Database**: SQLite (file-based, single-user) → must migrate to PostgreSQL 16 for multi-million user scale
- **Build**: Next.js standalone output already configured — good foundation
- **Auth**: NextAuth with credentials provider ready for production
- **Security**: Headers, Zod validation, error boundaries in place
- **Offline**: Service Worker with background sync implemented

### Production Changes Applied

**1. Prisma Schema Migration (SQLite → PostgreSQL)**
- Changed `provider` from `"sqlite"` to `"postgresql"`
- Added `previewFeatures = ["postgresqlExtensions"]` with `pgcrypto` extension
- `settings` field: `String @default("{}")` → `Json @default("{}")` (native JSONB)
- `frequencyDays` field: `String @default("[]")` → `Int[] @default([])` (native PostgreSQL integer array)
- `times` field in PrayerTimeCache: `String` → `Json` (native JSONB)
- Added additional indexes for query optimization: `@@index([userId, streak])`, `@@index([userId, type, date])`, `@@index([email])`, `@@index([date])`
- Created initial migration directory

**2. Code Updates for PostgreSQL Compatibility**
- `habits-server.ts`: `safeJsonArray()` removed — PostgreSQL returns native `Int[]` directly
- `badge-stats.ts`: `safeArr()` removed — same reason
- `habits/route.ts` + `habits/[id]/route.ts`: `JSON.stringify(d.frequencyDays)` → `d.frequencyDays` (pass native array to Prisma)
- `user.ts`: `JSON.stringify(settings)` → direct object (Json field handles serialization)
- `user.ts`: `parseSettings()` updated to handle both string (legacy) and object (PostgreSQL) returns
- `prayer/times/route.ts`: `buildFromCache()` updated to handle both string and object `times` field

**3. Multi-Stage Dockerfile**
- Stage 1 (deps): Node 22 Alpine, installs OpenSSL + bun, generates Prisma client
- Stage 2 (builder): Copies deps, builds Next.js standalone output
- Stage 3 (runner): Minimal image, non-root user (`nextjs:nodejs`), copies standalone + static + Prisma runtime
- HEALTHCHECK configured (30s interval, 3 retries)
- `docker-entrypoint.sh`: runs `prisma migrate deploy` then starts `node server.js`

**4. Docker Compose for Local Production Testing**
- PostgreSQL 16 Alpine with healthcheck
- Next.js app (builds from Dockerfile, depends on db healthcheck)
- Social WebSocket service
- Dedicated bridge network (`abhyas-network`)
- Named volume for PostgreSQL data (`abhyas_pgdata`)

**5. Next.js Production Config**
- Added `experimental.optimizePackageImports` for lucide-react, recharts, framer-motion, Radix UI
- Added `Strict-Transport-Security` header (HSTS)
- Added image optimization config (AVIF + WebP, 24h cache TTL)

**6. Package.json Updates**
- `start` script: `bun .next/standalone/server.js` → `node .next/standalone/server.js` (Node is the runtime in Docker)
- Added `db:deploy` script: `prisma migrate deploy` (for production migrations)
- Added `postinstall` script: `prisma generate` (auto-generates client on install)

**7. Environment Configuration**
- `.env.example`: documents all required production env vars (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
- `.gitignore`: tracks `.env.example`, ignores `.env`, ignores `db/` directory (local SQLite)

### Verified
- ✅ Lint clean (0 errors, 0 warnings)
- ✅ All JSON.stringify/parse calls updated for PostgreSQL Json/Int[] fields
- ✅ Dockerfile follows best practices (multi-stage, non-root, healthcheck)
- ✅ docker-compose.yml provides complete local production environment

### Deployment Instructions for Coolify
1. Create PostgreSQL 16 database (name: `abhyas-db`, user: `abhyas`)
2. Create application from GitHub repo using Dockerfile
3. Set environment variables:
   - `DATABASE_URL=postgresql://abhyas:PASSWORD@abhyas-db:5432/abhyas?schema=public`
   - `NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>`
   - `NEXTAUTH_URL=https://your-domain.com`
4. Deploy — the entrypoint script will auto-run migrations
5. Set up a separate service for the social WebSocket (mini-services/social, port 3003)

### Next priorities
- Generate actual Prisma migration SQL (run `prisma migrate dev` against PostgreSQL)
- Set up Redis for session caching (optional for current scale)
- Configure CDN for static assets (Coolify + CloudFlare)
- Set up database backups in Coolify
