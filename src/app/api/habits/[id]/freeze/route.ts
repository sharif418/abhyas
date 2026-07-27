import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

/**
 * POST /api/habits/:id/freeze — use a streak freeze for today on this habit.
 *
 * Rules:
 *  - 1 free freeze per ISO week per habit.
 *  - Freeze marks today as "forgiven" — the streak is preserved even if today
 *    is not completed (the streak engine treats frozenDate as a scheduled-but-
 *    forgiven day).
 *  - Cannot freeze if already completed today.
 *  - Cannot freeze if a freeze was already used this week.
 */

function isoWeekKey(date: Date): string {
  // ISO 8601 week: Thursday-based
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const today = todayKey();
  const weekKey = isoWeekKey(new Date());

  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== user.id) {
    return NextResponse.json({ error: "অভ্যাস পাওয়া যায়নি" }, { status: 404 });
  }

  // already completed today?
  const completed = await db.habitCompletion.findUnique({
    where: { habitId_date: { habitId: id, date: today } },
  });
  if (completed) {
    return NextResponse.json({
      error: "আজ ইতিমধ্যে সম্পন্ন — ফ্রিজের দরকার নেই",
    }, { status: 400 });
  }

  // already frozen today?
  if (habit.frozenDate === today) {
    return NextResponse.json({
      error: "আজকের জন্য ফ্রিজ ইতিমধ্যে ব্যবহৃত",
    }, { status: 400 });
  }

  // already used this week's freeze?
  if (habit.freezeUsedWeek === weekKey) {
    return NextResponse.json({
      error: "এই সপ্তাহের ফ্রিজ ইতিমধ্যে ব্যবহৃত (পরবর্তী সপ্তাহে আবার পাবেন)",
    }, { status: 400 });
  }

  const updated = await db.habit.update({
    where: { id },
    data: { frozenDate: today, freezeUsedWeek: weekKey },
  });

  return NextResponse.json({
    ok: true,
    frozenDate: updated.frozenDate,
    freezeUsedWeek: updated.freezeUsedWeek,
    weekKey,
  });
}

export { isoWeekKey };
