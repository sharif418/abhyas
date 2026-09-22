"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BadgeStatsData, BadgeSummary } from "@/components/stats/stats-shared";

interface StatsBadgesTabProps {
  badges: BadgeSummary[];
  badgeStats: BadgeStatsData;
}

/** Tier accents — glow hexes kept; rings get explicit dark: variants. */
const TIER_STYLE: Record<string, { ring: string; glow: string }> = {
  bronze: {
    ring: "ring-amber-700/40 dark:ring-amber-500/50",
    glow: "shadow-[0_0_12px_-4px_#b45309]",
  },
  silver: {
    ring: "ring-slate-400/40 dark:ring-slate-300/50",
    glow: "shadow-[0_0_12px_-4px_#94a3b8]",
  },
  gold: {
    ring: "ring-yellow-500/50 dark:ring-yellow-400/60",
    glow: "shadow-[0_0_14px_-3px_#eab308]",
  },
  platinum: {
    ring: "ring-cyan-400/50 dark:ring-cyan-300/60",
    glow: "shadow-[0_0_16px_-3px_#22d3ee]",
  },
};

/** ব্যাজ tab: badge grid with tier filter chips + progress on locked badges. */
export function StatsBadgesTab({ badges, badgeStats }: StatsBadgesTabProps) {
  const earnedCount = badges.filter((b) => b.earned).length;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="gap-3 rounded-3xl p-4">
        <CardHeader className="px-0">
          <CardTitle className="text-sm font-bold">
            ব্যাজ ({toBn(earnedCount)}/{toBn(badges.length)})
          </CardTitle>
          <CardDescription className="text-[11px]">অর্জনের মাইলফলক</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <BadgeGrid badges={badges} badgeStats={badgeStats} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Badge grid with tier filter — shows all badges, with filter chips for
 *  bronze/silver/gold/platinum tiers and an "all" option. */
function BadgeGrid({ badges, badgeStats }: { badges: BadgeSummary[]; badgeStats: BadgeStatsData }) {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const tiers = ["all", "bronze", "silver", "gold", "platinum"];
  const tierLabels: Record<string, string> = {
    all: "সব",
    bronze: "ব্রোঞ্জ",
    silver: "সিলভার",
    gold: "গোল্ড",
    platinum: "প্লাটিনাম",
  };

  const filtered = tierFilter === "all" ? badges : badges.filter((b) => b.tier === tierFilter);
  const filteredEarned = filtered.filter((b) => b.earned).length;

  return (
    <div>
      {/* Tier filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tiers.map((tier) => {
          const count =
            tier === "all" ? badges.length : badges.filter((b) => b.tier === tier).length;
          if (count === 0) return null;
          const earned =
            tier === "all"
              ? badges.filter((b) => b.earned).length
              : badges.filter((b) => b.tier === tier && b.earned).length;
          const isSelected = tierFilter === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {tierLabels[tier]} ({toBn(earned)}/{toBn(count)})
            </button>
          );
        })}
      </div>

      {/* Badge count for current filter */}
      {tierFilter !== "all" && (
        <div className="mb-2 text-[11px] text-muted-foreground">
          {tierLabels[tierFilter]}: {toBn(filteredEarned)}/{toBn(filtered.length)} অর্জিত
        </div>
      )}

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {filtered.map((b) => {
          const progress = getBadgeProgress(b.id, badgeStats);
          return (
            <BadgeTile
              key={b.id}
              icon={b.icon}
              name={b.name}
              description={b.description}
              earned={b.earned}
              tier={b.tier}
              progress={b.earned ? 1 : progress}
            />
          );
        })}
      </div>
    </div>
  );
}

function BadgeTile({
  icon,
  name,
  description,
  earned,
  tier,
  progress,
}: {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  tier: string;
  progress?: number; // 0..1 for locked badges
}) {
  const [expanded, setExpanded] = useState(false);
  const style = TIER_STYLE[tier] ?? TIER_STYLE.bronze;
  const pct = Math.round((progress ?? 0) * 100);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: earned ? 1.04 : 1 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-label={`${name} — ${description}${
        earned ? " (অর্জিত হয়েছে)" : " (এখনো অর্জিত হয়নি)"
      }`}
      title={description}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        earned
          ? cn("bg-gradient-to-b from-card to-muted/30 ring-2", style.ring, style.glow)
          : "bg-muted/30"
      )}
    >
      <div className={cn(!earned && "opacity-40")}>
        <IconRenderer
          name={earned ? icon : "Lock"}
          size={24}
          className={cn(!earned && "grayscale")}
        />
      </div>
      <div className="line-clamp-1 text-[10px] font-semibold leading-tight">{name}</div>

      {!earned && progress !== undefined && progress > 0 && (
        <div className="w-full">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-0.5 tabular text-[8px] text-muted-foreground">
            {toBn(pct)}%
          </div>
        </div>
      )}

      {/* Tap-to-expand description (title attr is inaccessible on touch) */}
      {expanded && (
        <p className="text-[8.5px] leading-snug text-muted-foreground">{description}</p>
      )}
    </motion.button>
  );
}

/** Compute progress (0..1) toward a badge based on badgeStats. */
function getBadgeProgress(badgeId: string, s: BadgeStatsData): number {
  const map: Record<string, number> = {
    first_step: Math.min(1, s.totalCompletions / 1),
    streak_7: Math.min(1, s.bestStreak / 7),
    streak_30: Math.min(1, s.bestStreak / 30),
    streak_100: Math.min(1, s.bestStreak / 100),
    streak_365: Math.min(1, s.bestStreak / 365),
    early_riser: Math.min(1, s.fajrStreak / 14),
    quran_reader: Math.min(1, s.quranPages / 60),
    collector: Math.min(1, s.habitsTracked / 5),
    architect: Math.min(1, s.habitsTracked / 10),
    perfect_day: Math.min(1, s.perfectDays / 1),
    perfect_week: Math.min(1, s.perfectDays / 7),
    century: Math.min(1, s.totalCompletions / 100),
    champion: Math.min(1, s.totalCompletions / 500),
    level_5: Math.min(1, s.level / 5),
    level_10: Math.min(1, s.level / 10),
  };
  return map[badgeId] ?? 0;
}
