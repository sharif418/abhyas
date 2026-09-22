import { db } from "@/lib/db";
import { deserializeJson, prismaJson } from "@/lib/db-compat";
import type { Goal, GoalMilestone } from "@/types/goals";

/**
 * Goal (লক্ষ্য) server helpers — serialization, milestone auto-complete,
 * progress clamping and XP rules. Shared by /api/goals routes.
 */

/** Serialize a raw DB row (works for both PostgreSQL Json + SQLite string). */
export function serializeGoal(raw: {
  id: string;
  userId: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  deadline: Date | null;
  milestones: unknown;
  note: string | null;
  active: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Goal {
  const milestones = deserializeJson<GoalMilestone[]>(raw.milestones) ?? [];
  return {
    ...raw,
    milestones,
    deadline: raw.deadline?.toISOString() ?? null,
    completedAt: raw.completedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

export function milestonesForDb(milestones: GoalMilestone[]) {
  // Target `string`: the SQLite client wants string, and the PostgreSQL
  // client's InputJsonValue also accepts string — compiles under both.
  return prismaJson<GoalMilestone[], string>(milestones);
}

/**
 * Apply a progress delta:
 *  - clamps currentValue into [0, targetValue]
 *  - auto-completes any milestone whose value has been reached
 *  - marks the goal completed when the target is reached
 * Returns the new value + which milestones just completed.
 */
export function applyProgress(goal: {
  targetValue: number;
  currentValue: number;
  milestones: GoalMilestone[];
  completedAt: Date | null;
}, delta: number): {
  currentValue: number;
  milestones: GoalMilestone[];
  newlyCompletedMilestones: string[];
  completed: boolean;
} {
  const raw = goal.currentValue + delta;
  const currentValue = Math.min(goal.targetValue, Math.max(0, raw));

  const milestones = goal.milestones.map((m) =>
    !m.done && currentValue >= m.value
      ? { ...m, done: true }
      : m
  );
  const newlyCompletedMilestones = milestones
    .filter((m, i) => m.done && !goal.milestones[i]?.done)
    .map((m) => m.title);

  const completed =
    goal.targetValue > 0 && currentValue >= goal.targetValue;

  return {
    currentValue,
    milestones,
    newlyCompletedMilestones,
    completed: completed && !goal.completedAt,
  };
}

/**
 * XP for a progress log — simple, bounded curve:
 *   • 3 XP per unit of forward progress, capped at 25 XP per log
 *   • +100 XP the moment the goal itself completes
 */
export function xpForProgress(delta: number, goalCompleted: boolean): number {
  const forward = Math.max(0, delta);
  const progressXp = Math.min(25, Math.ceil(forward * 3));
  return progressXp + (goalCompleted ? 100 : 0);
}

/** Deadline bucket for sorting/UI: overdue | today | soon | later | none. */
export function deadlineBucket(deadlineIso: string | null): "overdue" | "today" | "soon" | "later" | "none" {
  if (!deadlineIso) return "none";
  const now = new Date();
  const dl = new Date(deadlineIso);
  const dayMs = 86_400_000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = dl.getTime() - startToday;
  if (diff < 0) return "overdue";
  if (diff < dayMs) return "today";
  if (diff < 7 * dayMs) return "soon";
  return "later";
}
