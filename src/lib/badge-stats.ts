import { db } from "./db";
import { getOrCreateUser } from "./user";
import { todayKey, addDays, toDateKey, fromDateKey } from "./date-bn";
import { isScheduledOn } from "./streaks";
import { levelFromXp } from "./gamification";
import type { BadgeStats } from "@/types";

/**
 * Compute badge-relevant stats from the database.
 * `override` lets callers inject freshly-computed streak values.
 */
export async function computeBadgeStats(
  userId: string,
  override?: { currentStreak: number; bestStreak: number }
): Promise<BadgeStats> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("user not found");

  const habits = await db.habit.findMany({
    where: { userId, active: true },
    include: { completions: { select: { date: true } } },
  });

  const completions = await db.habitCompletion.findMany({
    where: { userId },
    select: { date: true },
  });
  const totalCompletions = completions.length;
  const habitsTracked = habits.length;

  // best streak across all habits
  let bestStreak = override?.bestStreak ?? 0;
  let currentStreak = override?.currentStreak ?? 0;
  for (const h of habits) {
    const set = new Set(h.completions.map((c) => c.date));
    const serialized = {
      frequency: h.frequency,
      frequencyDays: safeArr(h.frequencyDays),
    } as any;
    const cs = computeSimpleCurrentStreak(serialized, set);
    const bs = computeSimpleBestStreak(serialized, set);
    if (cs > currentStreak) currentStreak = cs;
    if (bs > bestStreak) bestStreak = bs;
  }

  // perfect days (last 60 days)
  const today = new Date();
  let perfectDays = 0;
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const key = toDateKey(d);
    let allDone = true;
    let any = false;
    for (const h of habits) {
      const serialized = {
        frequency: h.frequency,
        frequencyDays: safeArr(h.frequencyDays),
      } as any;
      if (isScheduledOn(serialized, d)) {
        any = true;
        if (!h.completions.some((c) => c.date === key)) {
          allDone = false;
          break;
        }
      }
    }
    if (any && allDone) perfectDays++;
  }

  // fajr streak
  const prayerRecords = await db.prayerRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  let fajrStreak = 0;
  for (const r of prayerRecords) {
    if (r.fajr) fajrStreak++;
    else break;
  }

  // quran pages
  const quranAgg = await db.quranSession.aggregate({
    where: { userId },
    _sum: { pagesRead: true },
  });
  const quranPages = quranAgg._sum.pagesRead ?? 0;

  // fasting days (prayer records with all 5 prayers is a proxy; track via a
  // dedicated habit category fallback). For now use habits tagged islamic.
  const fastingDays = 0;

  return {
    totalCompletions,
    bestStreak,
    currentStreak,
    habitsTracked,
    perfectDays,
    fajrStreak,
    quranPages,
    fastingDays,
    level: levelFromXp(user.xp),
  };
}

function safeArr(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function computeSimpleCurrentStreak(habit: any, set: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  let skippedToday = false;
  for (let i = 0; i < 366; i++) {
    const key = toDateKey(cursor);
    if (isScheduledOn(habit, cursor)) {
      if (set.has(key)) {
        streak++;
      } else if (i === 0 && !skippedToday) {
        skippedToday = true;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function computeSimpleBestStreak(habit: any, set: Set<string>): number {
  const sorted = Array.from(set).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = fromDateKey(key);
    if (!isScheduledOn(habit, d)) continue;
    if (prev) {
      const diff = Math.round(
        (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
          new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()).getTime()) /
          86400000
      );
      if (diff === 1) run++;
      else run = 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export { todayKey };
