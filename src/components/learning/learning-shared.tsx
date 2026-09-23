"use client";

import { motion } from "framer-motion";
import { Layers, Sparkles } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import type { LearningTrackWithMeta } from "@/types/learning";

/** Compact subject tag. */
export function SubjectTag({ subject }: { subject: string }) {
  return (
    <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {subject}
    </span>
  );
}

/** Horizontal progress bar with Bengali fraction label. */
export function LessonProgress({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`${toBn(done)}/${toBn(total)} লেসন শেষ`}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
        {toBn(done)}/{toBn(total)}
      </span>
    </div>
  );
}

/** One track row in the list. Whole card is a button into the detail. */
export function TrackRow({
  track,
  onOpen,
  index = 0,
}: {
  track: LearningTrackWithMeta;
  onOpen: () => void;
  index?: number;
}) {
  const complete = track.lessonCount > 0 && track.lessonsDone === track.lessonCount;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      onClick={onOpen}
      className="focus-visible:ring-ring/70 group w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
      aria-label={`${track.title} ট্র্যাক খুলুন`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: track.color }}
        >
          <IconRenderer name={track.icon} size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold group-hover:underline">{track.title}</h3>
            {complete && <Sparkles className="size-4 shrink-0 text-amber-500" aria-hidden />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SubjectTag subject={track.subject} />
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Layers className="size-3" aria-hidden />
              {toBn(track.minutesPerDay)} মিনিট/দিন
            </span>
          </div>
          <LessonProgress done={track.lessonsDone} total={track.lessonCount} className="mt-2.5" />
          {track.dueCards > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-primary">
              🔁 {toBn(track.dueCards)}টি কার্ড আজ রিভিউয়ের জন্য
            </p>
          ) : track.nextLesson ? (
            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              পরের লেসন: {track.nextLesson.title}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">সব লেসন শেষ ✨</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/** Small stat chip used in the hero. */
export function LearnStat({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "primary" | "amber";
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card/80 px-3 py-2.5 shadow-sm">
      <span
        className={cn(
          "text-lg font-extrabold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "amber" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {toBn(value)}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
