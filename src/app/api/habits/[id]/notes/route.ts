import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

const Schema = z.object({
  date: z.string().default(todayKey()),
  note: z.string().max(500).nullable(),
});

/**
 * POST /api/habits/:id/notes — set or clear a note for a completion date.
 * If the completion doesn't exist yet, it creates one (so users can add
 * a note even before toggling — the completion will be marked done).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== user.id) {
    return NextResponse.json({ error: "অভ্যাস পাওয়া যায়নি" }, { status: 404 });
  }

  const { date, note } = parsed.data;

  // upsert the completion with the note
  const existing = await db.habitCompletion.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });

  let completion;
  if (existing) {
    completion = await db.habitCompletion.update({
      where: { id: existing.id },
      data: { note: note ?? null },
    });
  } else {
    completion = await db.habitCompletion.create({
      data: { habitId: id, userId: user.id, date, note: note ?? null },
    });
  }

  return NextResponse.json({
    id: completion.id,
    date: completion.date,
    note: completion.note,
  });
}

/**
 * GET /api/habits/:id/notes?limit=30 — recent notes for this habit.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== user.id) {
    return NextResponse.json({ error: "পাওয়া যায়নি" }, { status: 404 });
  }

  const notes = await db.habitCompletion.findMany({
    where: { habitId: id, note: { not: null } },
    orderBy: { date: "desc" },
    take: 30,
    select: { id: true, date: true, note: true, completedAt: true },
  });

  return NextResponse.json({ notes });
}
