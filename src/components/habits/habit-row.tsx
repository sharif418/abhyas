"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/shared/icon-renderer";
import { toBn, todayKey } from "@/lib/date-bn";
import { CATEGORY_MAP } from "@/constants";
import { useFreezeHabit } from "@/hooks/use-freeze";
import type { HabitWithMeta } from "@/types";

interface HabitRowProps {
  habit: HabitWithMeta;
  onToggle: () => void;
  onOpen?: () => void;
  compact?: boolean;
}

/**
 * Premium habit row with one-tap completion.
 * The circular check on the right is the primary action (per the proposal:
 * "একটি ট্যাপেই অভ্যাস সম্পন্ন করা যাবে"). The rest of the row opens detail.
 */
export function HabitRow({ habit, onToggle, onOpen, compact = false }: HabitRowProps) {
  const cat = CATEGORY_MAP[habit.category];
  const done = habit.completedToday;
  const freeze = useFreezeHabit();
  const today = todayKey();
  const isFrozenToday = habit.frozenDate === today;
  // show freeze button when: streak at risk (≥3), not done today, not frozen today
  const canFreeze = !done && !isFrozenToday && habit.streak >= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:border-foreground/15",
        done && "border-primary/30 bg-primary/[0.04]",
        isFrozenToday && "border-sky-400/40 bg-sky-50/40 dark:bg-sky-950/20"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${habit.name} বিস্তারিত দেখুন`}
      >
        <IconTile name={habit.icon} color={habit.color} size={compact ? 38 : 44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate font-semibold leading-tight",
                done && "text-muted-foreground line-through decoration-2"
              )}
            >
              {habit.name}
            </span>
            {habit.isIslamic && (
              <span className="shrink-0 rounded-full bg-islamic/10 px-1.5 py-0.5 text-[9px] font-bold text-islamic">
                ইসলামিক
              </span>
            )}
            {isFrozenToday && (
              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                <Snowflake size={9} aria-hidden /> ফ্রিজ
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            {habit.streak > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 font-medium"
                style={getStreakStyle(habit.streak)}
                aria-label={`স্ট্রিক ${toBn(habit.streak)} দিন`}
              >
                <Flame
                  size={11}
                  fill="currentColor"
                  aria-hidden
                  className={habit.streak >= 30 ? "animate-pulse" : ""}
                />
                {toBn(habit.streak)}
                {habit.streak >= 100 && (
                  <span className="ml-0.5 rounded-full bg-amber-500/20 px-1 text-[8px] font-bold text-amber-600 dark:text-amber-400">
                    কিংবদন্তি
                  </span>
                )}
                {habit.streak >= 30 && habit.streak < 100 && (
                  <span className="ml-0.5 rounded-full bg-orange-500/20 px-1 text-[8px] font-bold text-orange-600 dark:text-orange-400">
                    তারকা
                  </span>
                )}
                {habit.streak >= 14 && habit.streak < 30 && (
                  <span className="ml-0.5 rounded-full bg-amber-500/15 px-1 text-[8px] font-bold text-amber-600 dark:text-amber-400">
                    দৃঢ়
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <span>{cat?.emoji}</span>
                {habit.category}
              </span>
            )}
            <span className="opacity-40">•</span>
            <div className="flex items-center gap-1">
              <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(habit.completionRate * 100)}%`,
                    background: habit.color,
                  }}
                />
              </div>
              <span className="tabular">{toBn(Math.round(habit.completionRate * 100))}%</span>
            </div>
          </div>
        </div>
      </button>

      {/* Freeze button (at-risk habits only) */}
      {canFreeze && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            freeze.mutate(habit.id);
          }}
          disabled={freeze.isPending}
          title="স্ট্রিক ফ্রিজ করুন (সপ্তাহে ১ বার)"
          aria-label={`${habit.name} স্ট্রিক ফ্রিজ করুন`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-300/50 bg-sky-50 text-sky-600 opacity-0 transition hover:bg-sky-100 group-hover:opacity-100 focus-visible:opacity-100 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-950/50"
        >
          <Snowflake size={15} aria-hidden />
          <span className="sr-only">স্ট্রিক ফ্রিজ করুন</span>
        </button>
      )}

      <CheckButton done={done} color={habit.color} onToggle={onToggle} />
    </motion.div>
  );
}

function CheckButton({
  done,
  color,
  onToggle,
}: {
  done: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.82 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      aria-pressed={done}
      aria-label={done ? "সম্পন্ন বাতিল করুন" : "অভ্যাস সম্পন্ন করুন"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        done ? "border-transparent text-white" : "border-foreground/20 text-transparent hover:border-foreground/40"
      )}
      style={done ? { background: color, boxShadow: `0 4px 12px -4px ${color}` } : {}}
    >
      {done && (
        <motion.svg
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 14 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </motion.svg>
      )}
      <span className="sr-only">{done ? "সম্পন্ন বাতিল করুন" : "অভ্যাস সম্পন্ন করুন"}</span>
    </motion.button>
  );
}

/**
 * Streak milestone styling — flame color intensifies with streak length.
 * 1-6: default streak color, 7-13: amber, 14-29: orange, 30+: deep red with glow.
 */
function getStreakStyle(streak: number): CSSProperties {
  if (streak >= 100)
    return { color: "#dc2626", textShadow: "0 0 8px rgba(220,38,38,0.5)" };
  if (streak >= 30)
    return { color: "#ea580c", textShadow: "0 0 6px rgba(234,88,12,0.4)" };
  if (streak >= 14)
    return { color: "#f97316", textShadow: "0 0 4px rgba(249,115,22,0.3)" };
  if (streak >= 7)
    return { color: "#f59e0b" };
  return { color: "var(--streak)" };
}
