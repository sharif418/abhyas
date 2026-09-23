import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import {
  awardXp,
  buildTrackMeta,
  completeLinkedHabitToday,
  serializeCard,
  syncLinkedGoal,
} from "@/lib/learning-server";
import { toDateKey } from "@/lib/date-bn";
import { LEARNING_XP } from "@/types/learning";
import type { TrackDetailResponse, TrackPatchResponse } from "@/types/learning";

export const dynamic = "force-dynamic";

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("lesson-toggle"),
    lessonId: z.string().min(1),
    done: z.boolean(),
  }),
  z.object({
    action: z.literal("lesson-add"),
    title: z.string().trim().min(2).max(120),
    content: z.string().trim().max(500).nullable().optional(),
  }),
  z.object({ action: z.literal("lesson-delete"), lessonId: z.string().min(1) }),
  z.object({
    action: z.literal("card-add"),
    front: z.string().trim().min(1).max(200),
    back: z.string().trim().min(1).max(300),
  }),
  z.object({ action: z.literal("card-delete"), cardId: z.string().min(1) }),
  z.object({
    action: z.literal("track-update"),
    title: z.string().trim().min(2).max(60).optional(),
    minutesPerDay: z.number().int().min(5).max(240).optional(),
    archived: z.boolean().optional(),
  }),
]);

/**
 * GET /api/learning/[id] — full track detail (lessons sorted, cards by due).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const track = await db.learningTrack.findFirst({
    where: { id, userId: user.id },
    include: {
      lessons: { select: { id: true, title: true, sortOrder: true, done: true } },
      cards: { select: { dueDate: true } },
    },
  });
  if (!track) {
    return NextResponse.json({ error: "ট্র্যাক পাওয়া যায়নি" }, { status: 404 });
  }

  const today = toDateKey(new Date());
  const meta = buildTrackMeta(track, track.lessons, track.cards, today);

  const lessons = await db.lesson.findMany({
    where: { trackId: id, userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const cards = await db.flashcard.findMany({
    where: { trackId: id, userId: user.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const body: TrackDetailResponse = {
    track: meta,
    lessons: lessons.map((l) => ({
      id: l.id,
      trackId: l.trackId,
      title: l.title,
      content: l.content,
      sortOrder: l.sortOrder,
      done: l.done,
      doneAt: l.doneAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    cards: cards.map(serializeCard),
  };
  return NextResponse.json(body);
}

/**
 * PATCH /api/learning/[id] — action discriminator (lesson/card/track edits).
 *
 * XP rules (symmetric & honest, mirrors the planner):
 *   • lesson completed +6 (false→true), un-complete reverses (floor 0)
 *   • one-time +40 when every lesson of the track is done
 *   • completing a lesson auto-completes the linked habit (once/day) and
 *     syncs the linked goal's currentValue/milestones.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const action = parsed.data;

  const track = await db.learningTrack.findFirst({ where: { id, userId: user.id } });
  if (!track) {
    return NextResponse.json({ error: "ট্র্যাক পাওয়া যায়নি" }, { status: 404 });
  }

  let xpDelta = 0;
  let trackCompleted = false;
  let habitCompleted = false;

  switch (action.action) {
    case "lesson-toggle": {
      const lesson = await db.lesson.findFirst({
        where: { id: action.lessonId, userId: user.id, trackId: id },
      });
      if (!lesson) {
        return NextResponse.json({ error: "লেসন পাওয়া যায়নি" }, { status: 404 });
      }
      const done = action.done;
      if (done !== lesson.done) xpDelta = done ? LEARNING_XP.lesson : -LEARNING_XP.lesson;

      await db.lesson.update({
        where: { id: lesson.id },
        data: { done, doneAt: done ? new Date() : null },
      });

      if (done) {
        // Track-completion bonus (one-time): all lessons done & not archived.
        const siblings = await db.lesson.count({
          where: { trackId: id, userId: user.id, done: false },
        });
        if (siblings === 0 && !track.archived) {
          trackCompleted = true;
          xpDelta += LEARNING_XP.trackComplete;
        }
        // Habit auto-complete (idempotent per day) + goal sync.
        habitCompleted = await completeLinkedHabitToday(track.habitId);
        const doneCount = await db.lesson.count({
          where: { trackId: id, userId: user.id, done: true },
        });
        await syncLinkedGoal(track.goalId, doneCount);
      }
      break;
    }

    case "lesson-add": {
      const count = await db.lesson.count({ where: { trackId: id, userId: user.id } });
      if (count >= 100) {
        return NextResponse.json({ error: "এক ট্র্যাকে সর্বোচ্চ ১০০টি লেসন" }, { status: 400 });
      }
      await db.lesson.create({
        data: {
          trackId: id,
          userId: user.id,
          title: action.title,
          content: action.content ?? null,
          sortOrder: count,
        },
      });
      break;
    }

    case "lesson-delete": {
      await db.lesson.deleteMany({ where: { id: action.lessonId, userId: user.id, trackId: id } });
      break;
    }

    case "card-add": {
      const count = await db.flashcard.count({ where: { trackId: id, userId: user.id } });
      if (count >= 500) {
        return NextResponse.json({ error: "এক ট্র্যাকে সর্বোচ্চ ৫০০টি কার্ড" }, { status: 400 });
      }
      await db.flashcard.create({
        data: {
          trackId: id,
          userId: user.id,
          front: action.front,
          back: action.back,
          dueDate: toDateKey(new Date()),
        },
      });
      break;
    }

    case "card-delete": {
      await db.flashcard.deleteMany({ where: { id: action.cardId, userId: user.id, trackId: id } });
      break;
    }

    case "track-update": {
      await db.learningTrack.update({
        where: { id },
        data: {
          ...(action.title !== undefined ? { title: action.title } : {}),
          ...(action.minutesPerDay !== undefined ? { minutesPerDay: action.minutesPerDay } : {}),
          ...(action.archived !== undefined ? { archived: action.archived } : {}),
        },
      });
      break;
    }
  }

  let totalXp = user.xp;
  let level = user.level;
  let leveledUp = false;
  if (xpDelta !== 0) {
    const r = await awardXp(user.id, user.xp, xpDelta);
    totalXp = r.totalXp;
    level = r.level;
    leveledUp = r.leveledUp;
  }

  const res: TrackPatchResponse = {
    ok: true,
    xpAwarded: xpDelta,
    totalXp,
    level,
    leveledUp,
    trackCompleted,
    habitCompleted,
  };
  return NextResponse.json(res);
}

/**
 * DELETE /api/learning/[id] — delete the track (lessons/cards cascade).
 * The linked habit & goal are kept (user data is never silently destroyed);
 * the caller can delete them explicitly from their own views.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const track = await db.learningTrack.findFirst({ where: { id, userId: user.id } });
  if (!track) {
    return NextResponse.json({ error: "ট্র্যাক পাওয়া যায়নি" }, { status: 404 });
  }
  await db.learningTrack.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
