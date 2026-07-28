import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey, lastNDays } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

const LogSchema = z.object({
  durationMin: z.number().int().min(1).max(180),
  type: z.enum(["work", "break"]).default("work"),
  habitId: z.string().nullable().optional(),
  tag: z.string().max(60).nullable().optional(),
  date: z.string().default(todayKey()),
});

/**
 * GET /api/focus?days=7 — focus sessions for the last N days + aggregate stats.
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 7)));
  const window = lastNDays(days);

  const sessions = await db.focusSession.findMany({
    where: { userId: user.id, date: { gte: window[0] } },
    orderBy: { date: "desc" },
  });

  const todaySessions = sessions.filter((s) => s.date === todayKey());
  const todayMinutes = todaySessions
    .filter((s) => s.type === "work")
    .reduce((sum, s) => sum + s.durationMin, 0);
  const totalMinutes = sessions
    .filter((s) => s.type === "work")
    .reduce((sum, s) => sum + s.durationMin, 0);
  const totalSessions = sessions.filter((s) => s.type === "work").length;

  // daily series for chart
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.type === "work") {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.durationMin);
    }
  }
  const dailySeries = window.map((d) => ({
    date: d,
    minutes: byDate.get(d) ?? 0,
  }));

  // focus streak: consecutive days (ending today or yesterday) with ≥1 work session
  const workDates = new Set(
    sessions.filter((s) => s.type === "work").map((s) => s.date)
  );
  let focusStreak = 0;
  let cursor = new Date();
  // allow today to be empty (streak still intact from yesterday)
  if (!workDates.has(todayKey())) {
    cursor = new Date(Date.now() - 86400000);
  }
  for (let i = 0; i < 366; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (workDates.has(key)) {
      focusStreak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }

  return NextResponse.json({
    sessions: sessions.slice(0, 50),
    todayMinutes,
    totalMinutes,
    totalSessions,
    dailySeries,
    focusStreak,
  });
}

/**
 * POST /api/focus — log a completed focus session.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = LogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const { durationMin, type, habitId, tag, date } = parsed.data;

  const session = await db.focusSession.create({
    data: {
      userId: user.id,
      habitId: habitId ?? null,
      date,
      durationMin,
      type,
      tag: tag ?? null,
      completed: true,
    },
  });

  // Award XP for completed work sessions (2 XP per minute)
  let xpAwarded = 0;
  let totalXp = user.xp;
  let newLevel = user.level;
  if (type === "work") {
    xpAwarded = durationMin * 2;
    totalXp = user.xp + xpAwarded;
    const { levelFromXp } = await import("@/lib/gamification");
    newLevel = levelFromXp(totalXp);
    await db.user.update({
      where: { id: user.id },
      data: { xp: totalXp, level: newLevel },
    });
  }

  return NextResponse.json({
    id: session.id,
    durationMin: session.durationMin,
    type: session.type,
    date: session.date,
    xpAwarded,
    totalXp,
    level: newLevel,
    leveledUp: newLevel > user.level,
  });
}
