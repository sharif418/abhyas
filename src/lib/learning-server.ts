/**
 * শেখা মডিউল server helpers — SM-2 scheduling, serialization, and the
 * habit/goal integration glue shared by /api/learning routes.
 */

import { addDays, toDateKey } from "@/lib/date-bn";
import { milestonesForDb } from "@/lib/goals-server";
import { deserializeJson } from "@/lib/db-compat";
import type { GoalMilestone } from "@/types/goals";
import type {
  Flashcard,
  LearningTrackWithMeta,
  ReviewGrade,
} from "@/types/learning";

// ---------------------------------------------------------------------------
// SM-2 spaced repetition (SuperMemo 2 — the industry-standard paper algorithm)
// ---------------------------------------------------------------------------

/** A card's schedulable state. */
export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

/** Compute the next SM-2 state for a grade. Pure function — unit-testable. */
export function sm2(state: Sm2State, grade: ReviewGrade): Sm2State {
  const { easeFactor, intervalDays, repetitions, lapses } = state;

  // Grade 0 (আবার) → reset: relearn now (due stays today).
  if (grade < 3) {
    return {
      repetitions: 0,
      intervalDays: 0,
      lapses: lapses + 1,
      easeFactor: adjustEase(easeFactor, 0),
    };
  }

  const rep = repetitions + 1;
  const interval =
    rep === 1 ? 1 : rep === 2 ? 6 : Math.max(1, Math.round(intervalDays * easeFactor));

  return {
    repetitions: rep,
    intervalDays: interval,
    lapses,
    easeFactor: adjustEase(easeFactor, grade),
  };
}

/** EF' = EF + (0.1 − (5−q)×(0.08 + (5−q)×0.02)), floored at 1.3. */
function adjustEase(easeFactor: number, grade: ReviewGrade): number {
  const q = Math.min(5, Math.max(0, grade));
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return Math.max(1.3, Math.round((easeFactor + delta) * 100) / 100);
}

/** Next due date key (Asia/Dhaka) for a computed interval. */
export function dueKeyFor(intervalDays: number): string {
  return toDateKey(addDays(new Date(), intervalDays));
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

type RawCard = {
  id: string;
  trackId: string;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueDate: string;
  lastReviewedAt: Date | null;
  createdAt: Date;
};

export function serializeCard(raw: RawCard): Flashcard {
  return {
    id: raw.id,
    trackId: raw.trackId,
    front: raw.front,
    back: raw.back,
    easeFactor: raw.easeFactor,
    intervalDays: raw.intervalDays,
    repetitions: raw.repetitions,
    lapses: raw.lapses,
    dueDate: raw.dueDate,
    lastReviewedAt: raw.lastReviewedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
  };
}

type RawTrack = {
  id: string;
  title: string;
  subject: string;
  icon: string;
  color: string;
  minutesPerDay: number;
  habitId: string | null;
  goalId: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Build LearningTrackWithMeta from a raw track + its lessons/cards. */
export function buildTrackMeta(
  raw: RawTrack,
  lessons: { id: string; title: string; sortOrder: number; done: boolean }[],
  cards: { dueDate: string }[],
  todayKeyStr: string,
): LearningTrackWithMeta {
  const sortedLessons = [...lessons].sort((a, b) =>
    a.sortOrder === b.sortOrder ? 0 : a.sortOrder - b.sortOrder,
  );
  const doneCount = sortedLessons.filter((l) => l.done).length;
  const next = sortedLessons.find((l) => !l.done);
  return {
    id: raw.id,
    title: raw.title,
    subject: raw.subject as LearningTrackWithMeta["subject"],
    icon: raw.icon,
    color: raw.color,
    minutesPerDay: raw.minutesPerDay,
    habitId: raw.habitId,
    goalId: raw.goalId,
    archived: raw.archived,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    lessonCount: sortedLessons.length,
    lessonsDone: doneCount,
    cardCount: cards.length,
    dueCards: cards.filter((c) => c.dueDate <= todayKeyStr).length,
    nextLesson: next ? { id: next.id, title: next.title } : null,
  };
}

// ---------------------------------------------------------------------------
// Habit + Goal integration
// ---------------------------------------------------------------------------

/**
 * Complete the track's linked habit for today (only when not already done).
 * Returns true when it completed the habit in this call.
 * Reuses toggleHabit so streaks/XP/badges behave exactly like a manual tick.
 */
export async function completeLinkedHabitToday(
  habitId: string | null,
): Promise<boolean> {
  if (!habitId) return false;
  const { db } = await import("@/lib/db");
  const { todayKey } = await import("@/lib/date-bn");
  const existing = await db.habitCompletion.findUnique({
    where: { habitId_date: { habitId, date: todayKey() } },
    select: { id: true },
  });
  if (existing) return false;

  const { toggleHabit } = await import("@/lib/habits-server");
  const result = await toggleHabit(habitId);
  return result.completed;
}

/**
 * Sync the linked goal's currentValue with lessons-done count, auto-marking
 * reached milestones and completion (compact mirror of /api/goals progress
 * logic — kept here so the learning path stays self-contained).
 */
export async function syncLinkedGoal(
  goalId: string | null,
  lessonsDone: number,
): Promise<void> {
  if (!goalId) return;
  const { db } = await import("@/lib/db");
  const goal = await db.goal.findUnique({ where: { id: goalId } });
  if (!goal) return;

  const milestones = deserializeJson<GoalMilestone[]>(goal.milestones) ?? [];
  const changed = milestones.some((m) => !m.done && m.value <= lessonsDone);
  if (changed) {
    for (const m of milestones) {
      if (!m.done && m.value <= lessonsDone) m.done = true;
    }
  }

  const completedNow =
    !goal.completedAt && goal.targetValue > 0 && lessonsDone >= goal.targetValue;

  await db.goal.update({
    where: { id: goalId },
    data: {
      currentValue: lessonsDone,
      milestones: milestonesForDb(milestones),
      ...(completedNow ? { completedAt: new Date() } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// XP award (shared mutation tail used by the routes)
// ---------------------------------------------------------------------------

export async function awardXp(
  userId: string,
  currentXp: number,
  delta: number,
): Promise<{ totalXp: number; level: number; leveledUp: boolean }> {
  const { db } = await import("@/lib/db");
  const { levelFromXp } = await import("@/lib/gamification");
  const totalXp = Math.max(0, currentXp + delta);
  const level = levelFromXp(totalXp);
  await db.user.update({
    where: { id: userId },
    data: { xp: totalXp, level },
  });
  return { totalXp, level, leveledUp: level > levelFromXp(currentXp) };
}
