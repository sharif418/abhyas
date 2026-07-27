import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey, lastNDays } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

const SetSchema = z.object({
  date: z.string().default(todayKey()),
  mood: z.number().int().min(1).max(5),
  note: z.string().max(500).nullable().optional(),
});

/**
 * GET /api/mood?days=30 — mood entries for the last N days (default 30).
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 30)));
  const window = lastNDays(days);

  const entries = await db.moodEntry.findMany({
    where: { userId: user.id, date: { gte: window[0] } },
    orderBy: { date: "desc" },
  });

  const byDate = new Map(entries.map((e) => [e.date, e]));
  const series = window.map((d) => {
    const e = byDate.get(d);
    return {
      date: d,
      mood: e?.mood ?? null,
      note: e?.note ?? null,
    };
  });

  // average mood
  const moods = entries.map((e) => e.mood);
  const avg = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;

  return NextResponse.json({
    series,
    average: avg,
    total: entries.length,
    today: byDate.get(todayKey()) ?? null,
  });
}

/**
 * POST /api/mood — set today's (or a given date's) mood + optional note.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = SetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const { date, mood, note } = parsed.data;

  const entry = await db.moodEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { mood, note: note ?? null },
    create: { userId: user.id, date, mood, note: note ?? null },
  });

  return NextResponse.json({
    id: entry.id,
    date: entry.date,
    mood: entry.mood,
    note: entry.note,
  });
}
