"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/stores/ui-store";
import { HomeView } from "@/components/home/home-view";
import { HabitsView } from "@/components/habits/habits-view";
import { StatsView } from "@/components/stats/stats-view";
import { IslamicView } from "@/components/islamic/islamic-view";
import { ProfileView } from "@/components/profile/profile-view";

const VIEWS = {
  home: HomeView,
  habits: HabitsView,
  stats: StatsView,
  islamic: IslamicView,
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
