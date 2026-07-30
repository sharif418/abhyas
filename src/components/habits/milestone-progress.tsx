"use client";

import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface MilestoneProgressProps {
  currentStreak: number;
  bestStreak: number;
  color: string;
}

const MILESTONES = [7, 14, 30, 60, 100, 180, 365];

/**
 * Streak milestone progress bar — shows the user's progress toward
 * their next streak milestone with a visual bar and milestone markers.
 *
 * Example: if currentStreak is 11, the next milestone is 14,
 * showing 78.6% progress toward it.
 */
export function MilestoneProgress({
  currentStreak,
  bestStreak,
  color,
}: MilestoneProgressProps) {
  // Find the next milestone (first one greater than current streak)
  const nextMilestone = MILESTONES.find((m) => m > currentStreak);
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= currentStreak) ?? 0;

  // If all milestones are reached, show the max
  if (!nextMilestone) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Trophy size={16} style={{ color }} />
            সর্বোচ্চ স্ট্রিক মাইলস্টোন অর্জিত!
          </span>
          <span className="tabular text-xs font-bold" style={{ color }}>
            {toBn(currentStreak)} দিন
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          আপনি ৩৬৫ দিনের মাইলস্টোন অর্জন করেছেন — অসাধারণ!
        </p>
      </div>
    );
  }

  const progress = (currentStreak - prevMilestone) / (nextMilestone - prevMilestone);
  const pct = Math.round(progress * 100);
  const daysLeft = nextMilestone - currentStreak;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Flame size={16} style={{ color }} fill="currentColor" />
          পরবর্তী মাইলস্টোন
        </span>
        <span className="tabular text-xs font-bold" style={{ color }}>
          {toBn(currentStreak)} / {toBn(nextMilestone)} দিন
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>

      {/* Milestone markers */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{toBn(prevMilestone)} দিন</span>
        <span className="font-medium" style={{ color }}>
          {toBn(daysLeft)} দিন বাকি {toBn(nextMilestone)} দিনের মাইলস্টোনে
        </span>
        <span>{toBn(nextMilestone)} দিন</span>
      </div>

      {/* Best streak comparison */}
      {bestStreak > currentStreak && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          <Trophy size={12} className="text-amber-500" />
          <span>
            সেরা স্ট্রিক: <span className="font-semibold">{toBn(bestStreak)}</span> দিন —
            আগের রেকর্ড ভাঙতে আর <span className="font-semibold">{toBn(bestStreak - currentStreak)}</span> দিন
          </span>
        </div>
      )}
    </div>
  );
}
