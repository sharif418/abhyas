import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { lastNDays, todayKey } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

interface JournalDay {
  date: string;
  mood: { mood: number; note: string | null } | null;
  completedHabits: { id: string; name: string; icon: string; color: string; note: string | null }[];
  totalScheduled: number;
}

/**
 * GET /api/journal?days=14 — unified timeline of mood + habit completions
 * + notes for the last N days (default 14, max 60).
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(searchParams.get("days") ?? 14)));
  const window = lastNDays(days);

  // fetch all data in parallel
  const [habits, completions, moodEntries] = await Promise.all([
    db.habit.findMany({
      where: { userId: user.id, active: true },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        frequency: true,
        frequencyDays: true,
      },
    }),
    db.habitCompletion.findMany({
      where: { userId: user.id, date: { gte: window[0] } },
      select: { habitId: true, date: true, note: true },
    }),
    db.moodEntry.findMany({
      where: { userId: user.id, date: { gte: window[0] } },
      select: { date: true, mood: true, note: true },
    }),
  ]);

  // index completions by date
  const completionsByDate = new Map<
    string,
    Map<string, { note: string | null }>
  >();
  for (const c of completions) {
    let dayMap = completionsByDate.get(c.date);
    if (!dayMap) {
      dayMap = new Map();
      completionsByDate.set(c.date, dayMap);
    }
    dayMap.set(c.habitId, { note: c.note });
  }

  // index moods by date
  const moodByDate = new Map<string, { mood: number; note: string | null }>();
  for (const m of moodEntries) {
    moodByDate.set(m.date, { mood: m.mood, note: m.note });
  }

  // build the timeline (most recent first)
  const timeline: JournalDay[] = [];
  for (let i = window.length - 1; i >= 0; i--) {
    const date = window[i];
    const dayCompletions = completionsByDate.get(date);
    const mood = moodByDate.get(date) ?? null;

    const completedHabits: JournalDay["completedHabits"] = [];
    if (dayCompletions) {
      for (const h of habits) {
        const c = dayCompletions.get(h.id);
        if (c) {
          completedHabits.push({
            id: h.id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            note: c.note,
          });
        }
      }
    }

    // count scheduled for this date
    const d = new Date(date);
    let totalScheduled = 0;
    for (const h of habits) {
      const days = safeArr(h.frequencyDays);
      if (h.frequency === "নির্দিষ্ট দিন") {
        if (days.length === 0 || days.includes(d.getDay())) totalScheduled++;
      } else {
        totalScheduled++;
      }
    }

    // only include days that have some activity (mood or completions)
    if (mood || completedHabits.length > 0) {
      timeline.push({
        date,
        mood,
        completedHabits,
        totalScheduled,
      });
    }
  }

  return NextResponse.json({
    days: timeline,
    total: timeline.length,
    today: todayKey(),
  });
}

function safeArr(raw: number[] | string | null | undefined): number[] {
  if (!raw) return [];
  // PostgreSQL returns a native number[] for Int[] fields.
  if (Array.isArray(raw)) return raw;
  // Legacy SQLite stored arrays as JSON strings.
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
