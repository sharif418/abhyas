"use client";

import { motion } from "framer-motion";
import { useMood, useSetMood } from "@/hooks/use-mood";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, emoji: "😞", label: "খুব খারাপ", color: "#dc2626" },
  { value: 2, emoji: "😕", label: "খারাপ", color: "#ea580c" },
  { value: 3, emoji: "😐", label: "মোটামুটি", color: "#ca8a04" },
  { value: 4, emoji: "🙂", label: "ভালো", color: "#16a34a" },
  { value: 5, emoji: "😄", label: "খুব ভালো", color: "#059669" },
];

/**
 * Daily mood selector — appears on the Home view.
 * Lets users log how they feel each day; the data feeds the mood trend chart.
 */
export function MoodSelector() {
  const { data } = useMood(30);
  const setMood = useSetMood();
  const todayMood = data?.today?.mood ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">💭</span>
          <div>
            <h2 className="text-sm font-bold leading-tight">আজকের মুড</h2>
            <p className="text-[10px] text-muted-foreground">
              আপনার দিন কেমন যাচ্ছে?
            </p>
          </div>
        </div>
        {data && data.total > 0 && (
          <div className="text-right">
            <div className="text-base">
              {MOODS.find((m) => Math.round(data.average) === m.value)?.emoji ?? "—"}
            </div>
            <div className="text-[9px] text-muted-foreground">
              গড় ({toBn(data.total)} দিন)
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-1.5">
        {MOODS.map((m) => {
          const active = todayMood === m.value;
          return (
            <motion.button
              key={m.value}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.08, y: -2 }}
              onClick={() => setMood.mutate({ mood: m.value })}
              disabled={setMood.isPending}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 transition",
                active
                  ? "border-transparent text-white shadow-md"
                  : "hover:border-foreground/20"
              )}
              style={
                active
                  ? { background: m.color, boxShadow: `0 6px 16px -6px ${m.color}` }
                  : undefined
              }
              aria-label={m.label}
            >
              <span className={cn("text-2xl transition", !active && "opacity-70")}>
                {m.emoji}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium leading-tight",
                  active ? "text-white" : "text-muted-foreground"
                )}
              >
                {m.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {todayMood && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 text-center text-[11px] text-muted-foreground"
        >
          ✓ আজকের মুড সংরক্ষিত:{" "}
          <span className="font-medium" style={{ color: MOODS[todayMood - 1].color }}>
            {MOODS[todayMood - 1].emoji} {MOODS[todayMood - 1].label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
