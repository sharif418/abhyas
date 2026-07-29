import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";

/**
 * GET /api/day?date=YYYY-MM-DD — fetch all activity for a specific day.
 * Returns habit completions (with habit details), mood entry, and focus sessions.
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "অবৈধ তারিখ" }, { status: 400 });
  }

  // habit completions with habit details
  const completions = await db.habitCompletion.findMany({
    where: { userId: user.id, date },
    include: {
      habit: {
        select: { id: true, name: true, icon: true, color: true, category: true },
      },
    },
  });

  // mood entry
  const mood = await db.moodEntry.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: { mood: true, note: true },
  });

  // focus sessions
  const focusSessions = await db.focusSession.findMany({
    where: { userId: user.id, date },
    select: { durationMin: true, type: true },
  });
  const focusMinutes = focusSessions
    .filter((s) => s.type === "work")
    .reduce((sum, s) => sum + s.durationMin, 0);

  return NextResponse.json({
    date,
    completions: completions.map((c) => ({
      habitId: c.habit.id,
      name: c.habit.name,
      icon: c.habit.icon,
      color: c.habit.color,
      category: c.habit.category,
      note: c.note,
    })),
    mood: mood
      ? { mood: mood.mood, note: mood.note }
      : null,
    focusMinutes,
    focusSessionCount: focusSessions.filter((s) => s.type === "work").length,
  });
}
