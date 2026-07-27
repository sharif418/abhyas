import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta } from "@/lib/habits-server";
import { computeBadgeStats } from "@/lib/badge-stats";
import { gamificationState, levelTitle } from "@/lib/gamification";
import { todayKey, toDateKey, addDays, lastNDays } from "@/lib/date-bn";
import { isScheduledOn } from "@/lib/streaks";
import { BADGES } from "@/constants";

export const dynamic = "force-dynamic";

/** GET /api/stats — aggregate dashboard stats */
export async function GET() {
  const user = await getOrCreateUser();
  const habits = await getHabitsWithMeta();

  const today = new Date();
  const todayStr = todayKey();

  // 7-day & 30-day completion series
  const last30 = lastNDays(30, today);
  const last7 = lastNDays(7, today);

  // daily completion counts across habits
  const completions = await db.habitCompletion.findMany({
    where: { userId: user.id, date: { gte: last30[0] } },
    select: { date: true, habitId: true },
  });
  const byDate = new Map<string, number>();
  for (const c of completions) {
    byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1);
  }

  const dailySeries = last30.map((k) => ({
    date: k,
    count: byDate.get(k) ?? 0,
  }));

  // weekly completion rate
  let weeklyDone = 0;
  let weeklyScheduled = 0;
  for (const k of last7) {
    const d = new Date(k);
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        weeklyScheduled++;
        if (h.completedDates.includes(k)) weeklyDone++;
      }
    }
  }

  // category breakdown
  const catMap = new Map<string, { done: number; total: number }>();
  for (const h of habits) {
    const entry = catMap.get(h.category) ?? { done: 0, total: 0 };
    entry.total += h.totalDone > 0 ? 1 : 1;
    entry.done += h.completedToday ? 1 : 0;
    catMap.set(h.category, entry);
  }
  const categoryStats = Array.from(catMap.entries()).map(([cat, v]) => ({
    category: cat,
    habits: v.total,
    doneToday: v.done,
  }));

  // perfect days (last 30)
  let perfectDays = 0;
  for (const k of last30) {
    const d = new Date(k);
    let all = true;
    let any = false;
    for (const h of habits) {
      if (isScheduledOn(h, d)) {
        any = true;
        if (!h.completedDates.includes(k)) {
          all = false;
          break;
        }
      }
    }
    if (any && all) perfectDays++;
  }

  // badges
  const earned = await db.achievement.findMany({
    where: { userId: user.id },
    select: { badgeId: true, earnedAt: true },
  });
  const earnedMap = new Map(earned.map((a) => [a.badgeId, a.earnedAt]));
  const badges = BADGES.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    tier: b.tier,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
  }));

  // badge stats for "in progress" indicators
  const badgeStats = await computeBadgeStats(user.id);

  const game = gamificationState(user.xp);

  // prayer stats today
  const prayer = await db.prayerRecord.findUnique({
    where: { userId_date: { userId: user.id, date: todayStr } },
  });
  const prayersDone = prayer
    ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length
    : 0;

  // quran
  const quranAgg = await db.quranSession.aggregate({
    where: { userId: user.id },
    _sum: { pagesRead: true },
    _count: true,
  });

  return NextResponse.json({
    user: {
      name: user.name,
      xp: user.xp,
      level: user.level,
      levelTitle: levelTitle(user.level),
      city: user.city,
    },
    gamification: game,
    today: {
      done: habits.filter((h) => h.completedToday).length,
      total: habits.length,
      pct: habits.length === 0 ? 0 : habits.filter((h) => h.completedToday).length / habits.length,
    },
    streaks: {
      bestOverall: habits.reduce((m, h) => Math.max(m, h.bestStreak), 0),
      activeStreaks: habits.filter((h) => h.streak > 0).length,
    },
    weekly: { done: weeklyDone, scheduled: weeklyScheduled, rate: weeklyScheduled ? weeklyDone / weeklyScheduled : 0 },
    perfectDays,
    dailySeries,
    categories: categoryStats,
    badges,
    badgeStats,
    prayersDone,
    quranPages: quranAgg._sum.pagesRead ?? 0,
    quranSessions: quranAgg._count,
    habitsCount: habits.length,
  });
}
