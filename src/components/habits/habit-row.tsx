"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/shared/icon-renderer";
import { toBn } from "@/lib/date-bn";
import { CATEGORY_MAP } from "@/constants";
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:border-foreground/15",
        done && "border-primary/30 bg-primary/[0.04]"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${habit.name} বিস্তারিত`}
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
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            {habit.streak > 0 ? (
              <span className="inline-flex items-center gap-0.5 font-medium text-streak">
                <Flame size={11} fill="currentColor" />
                {toBn(habit.streak)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <span>{cat?.emoji}</span>
                {habit.category}
              </span>
            )}
            <span className="opacity-40">•</span>
            <span>{toBn(Math.round(habit.completionRate * 100))}%</span>
          </div>
        </div>
      </button>

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
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
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
        >
          <path d="M20 6 9 17l-5-5" />
        </motion.svg>
      )}
    </motion.button>
  );
}
