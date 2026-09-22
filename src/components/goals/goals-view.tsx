"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Trophy } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useGoals, useLogGoalProgress, useDeleteGoal } from "@/hooks/use-goals";
import { GoalCard } from "./goal-card";
import { GoalForm } from "./goal-form";
import type { Goal } from "@/types/goals";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "completed";

/**
 * লক্ষ্য — the target/task system. Where habits track the journey, goals
 * define the destination: measurable targets, milestones, deadlines and
 * per-category organisation (ইবাদত / শেখা / কাজ / স্বাস্থ্য / আর্থিক / ব্যক্তিগত).
 */
export function GoalsView() {
  const { data, isLoading } = useGoals();
  const logProgress = useLogGoalProgress();
  const deleteGoal = useDeleteGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const goals = data?.goals ?? [];
  const summary = data?.summary;

  const activeGoals = goals.filter((g) => g.active && !g.completedAt);
  const completedGoals = goals.filter((g) => !!g.completedAt);
  const archivedGoals = goals.filter((g) => !g.active && !g.completedAt);

  const visible =
    filter === "active"
      ? activeGoals
      : filter === "completed"
        ? completedGoals
        : [...activeGoals, ...completedGoals];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  const handleDelete = (goal: Goal) => {
    if (window.confirm(`"${goal.title}" লক্ষ্যটি স্থায়ীভাবে মুছে ফেলা হবে। নিশ্চিত?`)) {
      deleteGoal.mutate(goal.id);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">লক্ষ্য</h1>
          <p className="text-xs text-muted-foreground">অভ্যাস যাত্রা — লক্ষ্য গন্তব্য</p>
        </div>
        <Button onClick={openCreate} size="sm" className="font-bold">
          <Plus className="size-4" aria-hidden />
          নতুন লক্ষ্য
        </Button>
      </div>

      {/* Summary hero */}
      {summary && summary.active + summary.completed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-5 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm"
        >
          <ProgressRing
            value={summary.overallProgress}
            size={92}
            stroke={10}
            aria-label={`সব লক্ষ্য মিলিয়ে ${Math.round(summary.overallProgress * 100)}% অগ্রগতি`}
          >
            <div className="text-center">
              <span className="text-xl font-extrabold tabular-nums">
                {toBn(Math.round(summary.overallProgress * 100))}%
              </span>
              <div className="text-[10px] text-muted-foreground">সামগ্রিক</div>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <h2 className="text-sm font-bold">আপনার লক্ষ্যসমূহ</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <SummaryPill icon="Target" value={summary.active} label="চলমান" />
              <SummaryPill icon="Trophy" value={summary.completed} label="পূর্ণ" />
              {summary.overdue > 0 && (
                <SummaryPill icon="AlarmClock" value={summary.overdue} label="সময় পার" danger />
              )}
              {summary.dueSoon > 0 && summary.overdue === 0 && (
                <SummaryPill icon="Clock" value={summary.dueSoon} label="শীঘ্রই শেষ" />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Target size={26} aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold">প্রথম লক্ষ্য ঠিক করুন</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              কুরআন খতম, ইংরেজি শেখা, ওজন কমানো — যে লক্ষ্যটাই হোক, মাইলফলক ভাগ করে সহজ করুন।
            </p>
          </div>
          <Button onClick={openCreate} className="font-bold">
            <Plus className="size-4" aria-hidden />
            লক্ষ্য যোগ করুন
          </Button>
        </div>
      )}

      {/* Filters */}
      {goals.length > 0 && (
        <div className="mt-4 flex gap-1.5">
          {(["all", "active", "completed"] as Filter[]).map((f) => {
            const count =
              f === "all" ? activeGoals.length + completedGoals.length
              : f === "active" ? activeGoals.length
              : completedGoals.length;
            if (count === 0) return null;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "focus-visible:ring-ring/70 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:outline-none",
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "সব" : f === "active" ? "চলমান" : "পূর্ণ"} ({toBn(count)})
              </button>
            );
          })}
        </div>
      )}

      {/* Goal list */}
      <div className="mt-3 space-y-3">
        {visible.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            busy={logProgress.isPending}
            onQuickLog={(delta) => logProgress.mutate({ id: goal.id, delta })}
            onEdit={() => openEdit(goal)}
            onDelete={() => handleDelete(goal)}
          />
        ))}
      </div>

      {/* Archived (paused) goals — collapsed hint */}
      {archivedGoals.length > 0 && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {toBn(archivedGoals.length)}টি লক্ষ্য স্থগিত আছে
        </p>
      )}

      <GoalForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}

function SummaryPill({
  icon,
  value,
  label,
  danger,
}: {
  icon: string;
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl bg-card/80 px-2.5 py-1.5 shadow-sm",
        danger && "bg-destructive/10"
      )}
    >
      <span className={danger ? "text-destructive" : "text-primary"}>
        <IconRenderer name={icon} size={14} />
      </span>
      <span className="tabular text-sm font-bold">{toBn(value)}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </span>
  );
}
