import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey, toDateKey, addDays } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

/** GET /api/quran — sessions + aggregate stats */
export async function GET() {
  const user = await getOrCreateUser();
  const sessions = await db.quranSession.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 100,
  });
  const agg = await db.quranSession.aggregate({
    where: { userId: user.id },
    _sum: { pagesRead: true },
    _count: true,
  });

  // streak: consecutive days (ending today or yesterday) with a session
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  let cursor = new Date();
  if (!dates.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  for (let i = 0; i < 366; i++) {
    if (dates.has(toDateKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    } else break;
  }

  return NextResponse.json({
    sessions,
    totalPages: agg._sum.pagesRead ?? 0,
    totalSessions: agg._count,
    streak,
  });
}

const Schema = z.object({
  date: z.string().default(todayKey()),
  surah: z.number().int().min(1).max(114),
  fromAyah: z.number().int().min(1),
  toAyah: z.number().int().min(1),
  pagesRead: z.number().min(0).default(0),
  juz: z.number().int().min(1).max(30).optional(),
});

/** POST /api/quran — log a reading session */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const d = parsed.data;
  const session = await db.quranSession.create({
    data: {
      userId: user.id,
      date: d.date,
      surah: d.surah,
      fromAyah: d.fromAyah,
      toAyah: d.toAyah,
      pagesRead: d.pagesRead,
      juz: d.juz,
    },
  });
  return NextResponse.json(session);
}
