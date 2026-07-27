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

  return NextResponse.json({
    sessions: sessions.slice(0, 50),
    todayMinutes,
    totalMinutes,
    totalSessions,
    dailySeries,
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

  const { durationMin, type, habitId, date } = parsed.data;

  const session = await db.focusSession.create({
    data: {
      userId: user.id,
      habitId: habitId ?? null,
      date,
      durationMin,
      type,
      completed: true,
    },
  });

  return NextResponse.json({
    id: session.id,
    durationMin: session.durationMin,
    type: session.type,
    date: session.date,
  });
}
