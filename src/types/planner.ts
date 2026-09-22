/**
 * দৈনিক পরিকল্পনা (Daily Planner) — shared types.
 * The morning-planning / evening-review ritual: 3 MITs + todos per day.
 */

export interface PlannerTask {
  id: string;
  date: string; // YYYY-MM-DD (Asia/Dhaka)
  title: string;
  isMit: boolean;
  done: boolean;
  doneAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** One day's row in the week strip. */
export interface PlannerDayStat {
  date: string;
  done: number;
  total: number;
  /** true when ≥1 task completed that day (used for the plan-streak). */
  active: boolean;
}

export interface PlannerSummary {
  date: string;
  total: number;
  done: number;
  mitsTotal: number;
  mitsDone: number;
  allMitsDone: boolean;
  /** Consecutive days (ending today) with ≥1 completed task. */
  planStreak: number;
}

export interface PlannerResponse {
  date: string;
  tasks: PlannerTask[];
  week: PlannerDayStat[];
  summary: PlannerSummary;
}

export interface PlannerToggleResponse {
  task: PlannerTask;
  /** Signed XP delta (+ on complete, − on un-complete). */
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  allMitsDone: boolean;
}

/** XP rules — kept client-visible for honest UI hints. */
export const PLANNER_XP = {
  mit: 6,
  todo: 4,
} as const;
