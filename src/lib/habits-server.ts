import { db } from "./db";
import { getOrCreateUser } from "./user";
import { todayKey, toDateKey, addDays, fromDateKey } from "./date-bn";
import {
  computeBestStreak,
  computeCurrentStreak,
  completionRate,
} from "./streaks";
import { levelFromXp } from "./gamification";
import type { Habit, HabitWithMeta } from "@/types";

/** Serialize a Prisma habit row → client Habit shape. */
export function serializeHabit(h: any): Habit {
  return {
    id: h.id,
    userId: h.userId,
    name: h.name,
    nameEn: h.nameEn ?? null,
    icon: h.icon,
    category: h.category,
    color: h.color,
    target: h.target,
    frequency: h.frequency,
    frequencyDays: safeJsonArray(h.frequencyDays),
    timesPerWeek: h.timesPerWeek ?? 0,
    timeOfDay: h.timeOfDay,
    reminderTime: h.reminderTime ?? null,
    streak: h.streak ?? 0,
    bestStreak: h.bestStreak ?? 0,
    totalDone: h.totalDone ?? 0,
    sortOrder: h.sortOrder ?? 0,
    active: h.active ?? true,
    isIslamic: h.isIslamic ?? false,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

function safeJsonArray(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(Number) : [];
  } catch {
    return [];
  }
}

/** Fetch all active habits for the local user, enriched with completions. */
export async function getHabitsWithMeta(): Promise<HabitWithMeta[]> {
  const user = await getOrCreateUser();
  const habits = await db.habit.findMany({
    where: { userId: user.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (habits.length === 0) return [];

  const completions = await db.habitCompletion.findMany({
    where: { userId: user.id },
    select: { habitId: true, date: true },
  });

  // group completions by habit
  const map = new Map<string, Set<string>>();
  for (const c of completions) {
    let set = map.get(c.habitId);
    if (!set) {
      set = new Set();
      map.set(c.habitId, set);
    }
    set.add(c.date);
  }

  const today = todayKey();

  return habits.map((h) => {
    const set = map.get(h.id) ?? new Set<string>();
    const completedDates = Array.from(set).sort();
    const habit = serializeHabit(h);
    // recompute streak from data for accuracy
    const streak = computeCurrentStreak(habit, set);
    const bestStreak = Math.max(h.bestStreak, computeBestStreak(habit, completedDates));
    return {
      ...habit,
      streak,
      bestStreak,
      completedToday: set.has(today),
      completedDates,
      completionRate: completionRate(habit, set, 30),
    };
  });
}

/**
 * Toggle a habit completion for a given date (default today).
 * Recomputes streak, awards XP, handles level-ups & badges.
 * Returns the full result payload.
 */
export async function toggleHabit(
  habitId: string,
  dateStr?: string
): Promise<{
  completed: boolean;
  streak: number;
  bestStreak: number;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newBadgeIds: string[];
}> {
  const user = await getOrCreateUser();
  const habitRow = await db.habit.findUnique({ where: { id: habitId } });
  if (!habitRow || habitRow.userId !== user.id) {
    throw new Error("অভ্যাস পাওয়া যায়নি");
  }
  const date = dateStr ?? todayKey();

  const existing = await db.habitCompletion.findUnique({
    where: { habitId_date: { habitId, date } },
  });

  if (existing) {
    // un-complete
    await db.habitCompletion.delete({ where: { id: existing.id } });
    const allCompletions = await db.habitCompletion.findMany({
      where: { habitId },
      select: { date: true },
    });
    const set = new Set(allCompletions.map((c) => c.date));
    const habit = serializeHabit(habitRow);
    const streak = computeCurrentStreak(habit, set);
    await db.habit.update({
      where: { id: habitId },
      data: {
        streak,
        totalDone: Math.max(0, habitRow.totalDone - 1),
      },
    });
    return {
      completed: false,
      streak,
      bestStreak: habitRow.bestStreak,
      xpAwarded: 0,
      totalXp: user.xp,
      level: levelFromXp(user.xp),
      leveledUp: false,
      newBadgeIds: [],
    };
  }

  // complete (race-safe: if a concurrent toggle already created it, idempotent)
  try {
    await db.habitCompletion.create({
      data: { habitId, userId: user.id, date },
    });
  } catch (e: unknown) {
    // P2002 = unique constraint on (habitId, date) → already completed
    if (isPrismaUniqueError(e)) {
      // treat as already completed: recompute and return success
      const all = await db.habitCompletion.findMany({
        where: { habitId },
        select: { date: true },
      });
      const set2 = new Set(all.map((c) => c.date));
      const habit2 = serializeHabit(habitRow);
      const streak2 = computeCurrentStreak(habit2, set2);
      return {
        completed: true,
        streak: streak2,
        bestStreak: Math.max(habitRow.bestStreak, streak2),
        xpAwarded: 0,
        totalXp: user.xp,
        level: levelFromXp(user.xp),
        leveledUp: false,
        newBadgeIds: [],
      };
    }
    throw e;
  }
  const allCompletions = await db.habitCompletion.findMany({
    where: { habitId },
    select: { date: true },
  });
  const set = new Set(allCompletions.map((c) => c.date));
  const habit = serializeHabit(habitRow);
  const streak = computeCurrentStreak(habit, set);
  const bestStreak = Math.max(habitRow.bestStreak, streak);

  // XP
  const { xpForCompletion } = await import("./gamification");
  const xpAwarded = xpForCompletion(streak, habit.isIslamic);
  const totalXp = user.xp + xpAwarded;
  const prevLevel = levelFromXp(user.xp);
  const newLevel = levelFromXp(totalXp);
  const leveledUp = newLevel > prevLevel;

  await db.habit.update({
    where: { id: habitId },
    data: { streak, bestStreak, totalDone: habitRow.totalDone + 1 },
  });
  await db.user.update({
    where: { id: user.id },
    data: { xp: totalXp, level: newLevel },
  });

  // Badge evaluation
  const newBadgeIds = await evaluateBadges(user.id, streak, bestStreak);

  return {
    completed: true,
    streak,
    bestStreak,
    xpAwarded,
    totalXp,
    level: newLevel,
    leveledUp,
    newBadgeIds,
  };
}

/** Evaluate & persist newly-earned badges. Returns ids of new badges. */
async function evaluateBadges(
  userId: string,
  currentStreak: number,
  bestStreak: number
): Promise<string[]> {
  const { BADGES } = await import("@/constants");
  const { computeBadgeStats } = await import("./badge-stats");
  const stats = await computeBadgeStats(userId, { currentStreak, bestStreak });

  const earned = await db.achievement.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const have = new Set(earned.map((a) => a.badgeId));
  const newlyEarned: string[] = [];

  for (const badge of BADGES) {
    if (have.has(badge.id)) continue;
    if (badge.check(stats)) {
      await db.achievement
        .create({ data: { userId, badgeId: badge.id } })
        .catch(() => {});
      newlyEarned.push(badge.id);
    }
  }
  return newlyEarned;
}

/** Type guard for Prisma unique-constraint errors (P2002). */
function isPrismaUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

export { todayKey, toDateKey, addDays, fromDateKey };
