"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Clock, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toBn } from "@/lib/date-bn";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types/goals";

interface GoalCardProps {
  goal: Goal;
  onQuickLog: (delta: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
}

/** Days remaining until deadline (Bengali-labelled). */
function deadlineLabel(deadlineIso: string | null): { text: string; tone: "danger" | "warn" | "ok" } | null {
  if (!deadlineIso) return null;
  const dl = new Date(deadlineIso);
  const days = Math.ceil((dl.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${toBn(Math.abs(days))} দিন পার হয়েছে`, tone: "danger" };
  if (days === 0) return { text: "আজই শেষ সময়!", tone: "danger" };
  if (days <= 7) return { text: `${toBn(days)} দিন বাকি`, tone: "warn" };
  return { text: `${toBn(days)} দিন বাকি`, tone: "ok" };
}

/**
 * GoalCard — a লক্ষ্য with a progress ring, milestone stepper, deadline
 * chip and quick ±progress buttons. Expandable for milestones & note.
 */
export function GoalCard({ goal, onQuickLog, onEdit, onDelete, busy }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const progress = goal.targetValue > 0 ? Math.min(1, goal.currentValue / goal.targetValue) : 0;
  const pct = Math.round(progress * 100);
  const done = !!goal.completedAt;
  const dl = deadlineLabel(goal.deadline);
  const remaining = Math.max(0, goal.targetValue - goal.currentValue);
  const step = goal.targetValue >= 1000 ? 100 : goal.targetValue >= 100 ? 10 : 1;

  const doneMilestones = goal.milestones.filter((m) => m.done).length;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card shadow-sm transition-colors",
        done && "border-primary/40"
      )}
    >
      {/* Head: ring + title + deadline */}
      <div className="flex items-center gap-4 p-4">
        <ProgressRing
          value={progress}
          size={72}
          stroke={8}
          color={goal.color}
          aria-label={`${goal.title}: ${pct}% সম্পন্ন`}
        >
          <div className="text-center">
            <span className="text-sm font-extrabold tabular-nums">{toBn(pct)}%</span>
          </div>
        </ProgressRing>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left focus-visible:ring-ring/70 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
            >
              <IconRenderer name={goal.icon} size={16} />
            </span>
            <h3 className="truncate text-sm font-bold">{goal.title}</h3>
            {done && <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="সম্পন্ন" />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {toBn(Math.round(goal.currentValue))} / {toBn(Math.round(goal.targetValue))} {goal.unit}
            {goal.milestones.length > 0 && (
              <span className="ml-2 opacity-75">
                • মাইলফলক {toBn(doneMilestones)}/{toBn(goal.milestones.length)}
              </span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
            >
              {goal.category}
            </span>
            {dl && !done && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  dl.tone === "danger"
                    ? "bg-destructive/10 text-destructive"
                    : dl.tone === "warn"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                )}
              >
                <Clock className="size-3" aria-hidden />
                {dl.text}
              </span>
            )}
          </div>
        </button>

        <div className="flex flex-col gap-1">
          {!done && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onQuickLog(step)}
                aria-label={`+${step} ${goal.unit} যোগ করুন`}
                className="focus-visible:ring-ring/70 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={busy || goal.currentValue <= 0}
                onClick={() => onQuickLog(-step)}
                aria-label={`${step} ${goal.unit} কমান`}
                className="focus-visible:ring-ring/70 flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition active:scale-95 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-r-full"
          style={{ backgroundColor: goal.color }}
        />
      </div>

      {/* Expandable: milestones + note + actions */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t px-4 py-3"
        >
          {goal.milestones.length > 0 && (
            <ul className="space-y-1.5">
              {goal.milestones.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      m.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-transparent"
                    )}
                    aria-hidden
                  >
                    <CheckCircle2 className="size-3" />
                  </span>
                  <span className={cn(m.done ? "text-foreground line-through opacity-60" : "text-muted-foreground")}>
                    {m.title}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {toBn(m.value)} {goal.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {goal.note && (
            <p className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
              {goal.note}
            </p>
          )}

          {!done && remaining > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              আর {toBn(Math.round(remaining))} {goal.unit} বাকি — পারবেন ইনশাআল্লাহ!
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="focus-visible:ring-ring/70 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Trash2 className="size-3.5" aria-hidden />
              মুছুন
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="focus-visible:ring-ring/70 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:ring-2 focus-visible:outline-none"
            >
              সম্পাদনা
            </button>
          </div>
        </motion.div>
      )}

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="বিস্তারিত দেখুন"
          className="flex w-full items-center justify-center gap-1 border-t py-1.5 text-[10px] text-muted-foreground transition hover:text-foreground"
        >
          <ChevronDown className="size-3.5" aria-hidden />
          মাইলফলক ও বিস্তারিত
        </button>
      )}
    </motion.article>
  );
}
