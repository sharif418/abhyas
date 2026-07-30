"use client";

import { motion } from "framer-motion";
import { Trophy, Flame, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, getBengaliWeekdayShort } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface StatsLite {
  weekly: { done: number; scheduled: number; rate: number };
  perfectDays: number;
  today: { done: number; total: number };
}

/**
 * Weekly challenge card — gamification element that challenges the user
 * to maintain their habit consistency this week.
 *
 * Shows:
 * - Current week's completion rate as a progress ring
 * - Challenge tiers: Bronze (50%), Silver (75%), Gold (90%), Platinum (100%)
 * - Motivational message based on current progress
 * - Days remaining in the week
 */
export function WeeklyChallengeCard() {
  const { data: stats } = useQuery<StatsLite>({
    queryKey: ["stats"],
    queryFn: () => api.get<StatsLite>("/api/stats"),
    staleTime: 30_000,
  });

  const rate = stats?.weekly.rate ?? 0;
  const pct = Math.round(rate * 100);
  const done = stats?.weekly.done ?? 0;
  const scheduled = stats?.weekly.scheduled ?? 0;

  // Calculate days remaining in the week (assuming week starts Saturday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  // If week starts on Saturday, days remaining = (6 - (dayOfWeek + 1) % 7) % 7 + 1
  // But let's keep it simple: if today is Saturday, 7 days left; Sunday = 6, etc.
  const daysRemaining = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;

  const tier = getTier(pct);
  const message = getMessage(pct, daysRemaining);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/5 via-card to-card p-4 shadow-sm"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Trophy size={16} className={tier.color} />
            সাপ্তাহিক চ্যালেঞ্জ
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              tier.bg,
              tier.color,
            )}
          >
            {tier.label}
          </span>
        </div>

        {/* Progress display */}
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-muted"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                className={tier.color}
                initial={{ strokeDasharray: "0 176" }}
                animate={{ strokeDasharray: `${(pct / 100) * 176} 176` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute text-center">
              <div className="tabular text-base font-extrabold">{toBn(pct)}%</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
              <Flame size={13} className="text-orange-500" />
              <span className="text-muted-foreground">সম্পন্ন:</span>
              <span className="font-bold tabular">
                {toBn(done)}/{toBn(scheduled)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Target size={13} className="text-primary" />
              <span className="text-muted-foreground">বাকি:</span>
              <span className="font-bold tabular">{toBn(daysRemaining)} দিন</span>
            </div>
            <p className="pt-0.5 text-[11px] text-muted-foreground">{message}</p>
          </div>
        </div>

        {/* Tier milestones */}
        <div className="mt-3 flex items-center justify-between border-t pt-2">
          {[
            { label: "৫০%", value: 50, tier: "bronze" },
            { label: "৭৫%", value: 75, tier: "silver" },
            { label: "৯০%", value: 90, tier: "gold" },
            { label: "১০০%", value: 100, tier: "platinum" },
          ].map((m) => {
            const reached = pct >= m.value;
            return (
              <div key={m.value} className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold transition",
                    reached
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {reached ? "✓" : toBn(m.value / 10)}
                </div>
                <span className="text-[8px] text-muted-foreground">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function getTier(pct: number) {
  if (pct >= 100)
    return { label: "প্লাটিনাম", color: "text-cyan-500", bg: "bg-cyan-500/10" };
  if (pct >= 90)
    return { label: "গোল্ড", color: "text-yellow-500", bg: "bg-yellow-500/10" };
  if (pct >= 75)
    return { label: "সিলভার", color: "text-slate-400", bg: "bg-slate-400/10" };
  if (pct >= 50)
    return { label: "ব্রোঞ্জ", color: "text-amber-700", bg: "bg-amber-700/10" };
  return { label: "শুরু", color: "text-muted-foreground", bg: "bg-muted" };
}

function getMessage(pct: number, daysLeft: number): string {
  if (pct >= 100) return "নিখুঁত সপ্তাহ! অসাধারণ!";
  if (pct >= 90) return "প্রায় শেষ! আর একটু ধাক্কা!";
  if (pct >= 75) return "ভালো অগ্রগতি! চালিয়ে যান!";
  if (pct >= 50) return "অর্ধেক পথ পার! চালিয়ে যান।";
  if (daysLeft > 3) return "এখনো সময় আছে — শুরু করুন!";
  if (daysLeft > 1) return `${toBn(daysLeft)} দিন বাকি — ত্বরিত করুন!`;
  return "শেষ দিন! সম্পন্ন করুন!";
}
