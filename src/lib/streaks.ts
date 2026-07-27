import { addDays, diffDays, fromDateKey, toDateKey, todayKey } from "./date-bn";
import type { Habit } from "@/types";

/**
 * Streak engine — the heart of a habit tracker.
 *
 * A streak is the count of consecutive *scheduled* days up to today
 * (or the most recent scheduled day) that have a completion record.
 *
 * Schedule rules:
 *  - "প্রতিদিন"            → every day counts
 *  - "নির্দিষ্ট দিন"        → only weekdays in frequencyDays count (0=Sun..6=Sat)
 *  - "সপ্তাহে কয়েকবার"    → flexible; for streak we still require a completion
 *                            on the last scheduled window (weekly rolling)
 *  - "মাসে একবার"          → monthly cadence (rare); use last 31-day window
 */

export function isScheduledOn(habit: Habit, date: Date): boolean {
  switch (habit.frequency) {
    case "প্রতিদিন":
      return true;
    case "নির্দিষ্ট দিন": {
      const wd = date.getDay();
      const days = habit.frequencyDays ?? [];
      if (days.length === 0) return true; // fallback: treat as daily
      return days.includes(wd);
    }
    case "সপ্তাহে কয়েকবার":
      return true; // flexible — any day can count
    case "মাসে একবার":
      return date.getDate() === 1; // first of month proxy
    default:
      return true;
  }
}

/**
 * Compute the current streak for a habit given a Set of completion date keys.
 * Walks backwards from today; on non-scheduled days we skip (don't break).
 * Today not yet completed is allowed (streak intact until end of day).
 */
export function computeCurrentStreak(
  habit: Habit,
  completed: Set<string>,
  today: Date = new Date(),
  frozenDate?: string | null
): number {
  let streak = 0;
  let cursor = new Date(today);
  // allow today to be incomplete without breaking
  let allowedTodaySkip = true;
  const frozen = frozenDate ?? null;

  // Cap iterations to avoid infinite loops (1 year max)
  for (let i = 0; i < 366; i++) {
    const key = toDateKey(cursor);
    const scheduled = isScheduledOn(habit, cursor);

    if (scheduled) {
      const done = completed.has(key);
      const isFrozen = key === frozen;
      if (done) {
        streak++;
        allowedTodaySkip = false;
      } else if (isFrozen) {
        // frozen day: streak preserved (counts as a forgiven day)
        streak++;
        allowedTodaySkip = false;
      } else {
        // today may be pending
        if (i === 0 && allowedTodaySkip) {
          // don't break streak, just move back
        } else {
          break;
        }
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Best (longest) streak given full completion history.
 */
export function computeBestStreak(
  habit: Habit,
  completedKeys: string[]
): number {
  if (completedKeys.length === 0) return 0;
  // sort ascending
  const sorted = [...new Set(completedKeys)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;

  for (const key of sorted) {
    const d = fromDateKey(key);
    if (!isScheduledOn(habit, d)) continue;
    if (prev && diffDays(prev, d) === 1) {
      run++;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/**
 * Heatmap intensity for a date: 0 (none) | 1 (scheduled, not done) | 2..4 (done levels).
 * Returns a level 0..4 used for color shading.
 */
export function heatmapLevel(
  habit: Habit,
  completed: Set<string>,
  date: Date
): 0 | 1 | 2 | 3 | 4 {
  const key = toDateKey(date);
  const scheduled = isScheduledOn(habit, date);
  if (!scheduled) return 0;
  if (completed.has(key)) return 4;
  // near-miss shading: if it's a recent scheduled day missed, level 1
  return 1;
}

/** Completion rate over the last N scheduled days. */
export function completionRate(
  habit: Habit,
  completed: Set<string>,
  windowDays: number,
  today: Date = new Date()
): number {
  let scheduled = 0;
  let done = 0;
  let cursor = new Date(today);
  for (let i = 0; i < windowDays; i++) {
    if (isScheduledOn(habit, cursor)) {
      scheduled++;
      if (completed.has(toDateKey(cursor))) done++;
    }
    cursor = addDays(cursor, -1);
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

/** Perfect days: dates where every active habit was completed. */
export function countPerfectDays(
  habits: Habit[],
  completionMap: Map<string, Set<string>>,
  windowDays: number,
  today: Date = new Date()
): number {
  if (habits.length === 0) return 0;
  let perfect = 0;
  let cursor = new Date(today);
  for (let i = 0; i < windowDays; i++) {
    const key = toDateKey(cursor);
    let allDone = true;
    for (const h of habits) {
      if (!h.active) continue;
      const set = completionMap.get(h.id) ?? new Set<string>();
      if (isScheduledOn(h, cursor) && !set.has(key)) {
        allDone = false;
        break;
      }
    }
    if (allDone) perfect++;
    cursor = addDays(cursor, -1);
  }
  return perfect;
}

export { todayKey };
