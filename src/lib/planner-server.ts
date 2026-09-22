import { addDays, fromDateKey, toDateKey } from "@/lib/date-bn";
import type { PlannerDayStat, PlannerTask } from "@/types/planner";

/**
 * Planner (দৈনিক পরিকল্পনা) server helpers — serialization, day-strip
 * computation and plan-streak. Shared by /api/planner routes.
 */

/** Serialize a raw DB row into the API shape (ISO strings). */
export function serializePlannerTask(raw: {
  id: string;
  date: string;
  title: string;
  isMit: boolean;
  done: boolean;
  doneAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PlannerTask {
  return {
    ...raw,
    doneAt: raw.doneAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

/** Sort: MITs first (by sortOrder), then todos (by sortOrder). */
export function sortTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (a.isMit !== b.isMit) return a.isMit ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Build the 7-day strip ending today (or ending `todayKeyStr`). */
export function buildWeekStrip(
  todayKeyStr: string,
  rows: { date: string; done: boolean }[]
): PlannerDayStat[] {
  const byDate = new Map<string, { done: number; total: number }>();
  for (const r of rows) {
    const agg = byDate.get(r.date) ?? { done: 0, total: 0 };
    agg.total += 1;
    if (r.done) agg.done += 1;
    byDate.set(r.date, agg);
  }
  const out: PlannerDayStat[] = [];
  const today = fromDateKey(todayKeyStr);
  for (let i = 6; i >= 0; i--) {
    const key = toDateKey(addDays(today, -i));
    const agg = byDate.get(key) ?? { done: 0, total: 0 };
    out.push({ date: key, done: agg.done, total: agg.total, active: agg.done > 0 });
  }
  return out;
}

/**
 * Consecutive days ending TODAY (not the requested date) with ≥1 completed
 * task. A missed day breaks the streak; future days are ignored.
 */
export function planStreakFrom(
  todayKeyStr: string,
  rows: { date: string; done: boolean }[]
): number {
  const activeDays = new Set(rows.filter((r) => r.done).map((r) => r.date));
  const today = fromDateKey(todayKeyStr);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    // walk backwards from today
    const key = toDateKey(addDays(today, -i));
    if (activeDays.has(key)) streak += 1;
    else if (key === todayKeyStr) continue; // today not yet active ≠ broken
    else break;
  }
  return streak;
}

/** Validated date-key or today (Asia/Dhaka). */
export function validDateOrToday(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return toDateKey(new Date());
}

/** Next sortOrder for a (date, isMit) bucket. */
export function nextSortOrder(tasks: { isMit: boolean; sortOrder: number }[], isMit: boolean): number {
  const bucket = tasks.filter((t) => t.isMit === isMit);
  return bucket.length === 0 ? 0 : Math.max(...bucket.map((t) => t.sortOrder)) + 1;
}
