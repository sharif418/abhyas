import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import {
  awardXp,
  completeLinkedHabitToday,
  dueKeyFor,
  serializeCard,
  sm2,
} from "@/lib/learning-server";
import { LEARNING_XP } from "@/types/learning";
import type { ReviewResponse } from "@/types/learning";

export const dynamic = "force-dynamic";

const ReviewSchema = z.object({
  cardId: z.string().min(1),
  /** 0 = আবার, 3 = কঠিন, 4 = ভালো, 5 = সহজ (SM-2 quality grades). */
  grade: z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)]),
});

/**
 * POST /api/learning/review — grade a flashcard: advance its SM-2 schedule,
 * award XP, and auto-complete the track's linked habit for today (once).
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const { cardId, grade } = parsed.data;

  const card = await db.flashcard.findFirst({ where: { id: cardId, userId: user.id } });
  if (!card) {
    return NextResponse.json({ error: "কার্ড পাওয়া যায়নি" }, { status: 404 });
  }

  // Advance the SM-2 schedule.
  const next = sm2(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    grade,
  );
  const updated = await db.flashcard.update({
    where: { id: card.id },
    data: {
      ...next,
      dueDate: dueKeyFor(next.intervalDays),
      lastReviewedAt: new Date(),
    },
  });

  // Reviews are small but frequent — +2 XP each (no reversal: a graded
  // review is effort already spent; "আবার" simply reschedules the card).
  const xp = await awardXp(user.id, user.xp, LEARNING_XP.review);

  // Habit auto-complete: the review session counts as today's practice.
  const track = await db.learningTrack.findUnique({ where: { id: card.trackId } });
  const habitCompleted = await completeLinkedHabitToday(track?.habitId ?? null);

  const res: ReviewResponse = {
    card: serializeCard(updated),
    xpAwarded: LEARNING_XP.review,
    totalXp: xp.totalXp,
    level: xp.level,
    leveledUp: xp.leveledUp,
    habitCompleted,
  };
  return NextResponse.json(res);
}
