"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useUIStore } from "@/stores/ui-store";
import { HomeView } from "@/components/home/home-view";
import { HabitsView } from "@/components/habits/habits-view";
import { ViewSkeleton } from "./view-skeleton";
import type { ComponentType } from "react";

/**
 * View loading strategy:
 *  - Home + Habits: eagerly loaded (primary views, needed on first paint).
 *  - Stats (Recharts), Focus (timer), Social (socket.io), Journal, Islamic
 *    (prayer times + Quran tracker), Profile: lazy-loaded via `next/dynamic`
 *    so their chunks only ship when the user opens them. Each shows the
 *    `ViewSkeleton` branded fallback while the chunk downloads.
 */
const StatsView = dynamic(
  () => import("@/components/stats/stats-view").then((m) => ({ default: m.StatsView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);
const FocusView = dynamic(
  () => import("@/components/focus/focus-view").then((m) => ({ default: m.FocusView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);
const IslamicView = dynamic(
  () => import("@/components/islamic/islamic-view").then((m) => ({ default: m.IslamicView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);
const SocialView = dynamic(
  () => import("@/components/social/social-view").then((m) => ({ default: m.SocialView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);
const JournalView = dynamic(
  () => import("@/components/journal/journal-view").then((m) => ({ default: m.JournalView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);
const ProfileView = dynamic(
  () => import("@/components/profile/profile-view").then((m) => ({ default: m.ProfileView })),
  { loading: () => <ViewSkeleton />, ssr: false }
);

const VIEWS: Record<string, ComponentType> = {
  home: HomeView,
  habits: HabitsView,
  stats: StatsView,
  islamic: IslamicView,
  social: SocialView,
  journal: JournalView,
  focus: FocusView,
  profile: ProfileView,
} as const;

/** Client-side view router (single-page app). */
export function ViewRouter() {
  const view = useUIStore((s) => s.view);
  const Active = VIEWS[view] ?? HomeView;

  return (
    <main className="min-h-0 flex-1 pb-24 lg:pb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Active />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
