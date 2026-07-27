"use client";

import { motion } from "framer-motion";
import { toBn } from "@/lib/date-bn";
import { IconTile } from "@/components/shared/icon-renderer";

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

export interface MoodCorrelation {
  habitId: string;
  habitName: string;
  icon: string;
  color: string;
  avgMoodWhenDone: number | null;
  avgMoodWhenNotDone: number | null;
  sampleSize: number;
}

/**
 * Shows which habits correlate with better moods.
 * Displays avg mood when the habit was done vs not done, sorted by impact.
 */
export function MoodCorrelationCard({
  correlations,
}: {
  correlations: MoodCorrelation[];
}) {
  if (correlations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <div className="mb-2">
          <h2 className="text-sm font-bold">মুড-অভ্যাস সম্পর্ক</h2>
          <p className="text-[11px] text-muted-foreground">
            কোন অভ্যাসগুলো আপনার মুড ভালো রাখে
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <span className="text-2xl">🔍</span>
          <p className="text-xs text-muted-foreground">
            বিশ্লেষণের জন্য আরও মুড ও অভ্যাস ডেটা দরকার (অন্তত ২ দিন)।
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-sm font-bold">মুড-অভ্যাস সম্পর্ক</h2>
        <p className="text-[11px] text-muted-foreground">
          যে অভ্যাসগুলো আপনার মুড সবচেয়ে ভালো রাখে
        </p>
      </div>

      <div className="space-y-2.5">
        {correlations.map((c, i) => {
          const doneMood = c.avgMoodWhenDone ?? 0;
          const notDoneMood = c.avgMoodWhenNotDone ?? 0;
          const diff = doneMood - notDoneMood;
          const isPositive = diff > 0;
          return (
            <motion.div
              key={c.habitId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <IconTile name={c.icon} color={c.color} size={32} iconSize={16} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-semibold">
                    {c.habitName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {toBn(c.sampleSize)} দিন
                  </span>
                </div>
                {/* Mood comparison bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">করলে</span>
                      <span className="text-[10px]">
                        {MOOD_EMOJI[Math.round(doneMood)]}
                      </span>
                      <span className="tabular text-[10px] font-bold">
                        {toBn(doneMood.toFixed(1))}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(doneMood / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">না করলে</span>
                      <span className="text-[10px]">
                        {MOOD_EMOJI[Math.round(notDoneMood)]}
                      </span>
                      <span className="tabular text-[10px] font-bold">
                        {toBn(notDoneMood.toFixed(1))}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-muted-foreground/40"
                        style={{ width: `${(notDoneMood / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Impact delta */}
              <div
                className={
                  "shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold " +
                  (isPositive
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400")
                }
              >
                {isPositive ? "+" : ""}
                {toBn(Math.abs(diff).toFixed(1))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[9px] text-muted-foreground">
        💡 যে অভ্যাসে পার্থক্য বেশি, সেটি আপনার মুডে সবচেয়ে বেশি প্রভাব ফেলে
      </p>
    </motion.div>
  );
}
