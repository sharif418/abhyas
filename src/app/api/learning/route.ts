import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { buildTrackMeta } from "@/lib/learning-server";
import { findTemplate } from "@/constants/learning-tracks";
import { toDateKey } from "@/lib/date-bn";
import type { LearningResponse, LearningSubject } from "@/types/learning";

export const dynamic = "force-dynamic";

const SUBJECTS = ["আরবি", "ইংরেজি", "কোডিং", "পড়াশোনা", "HSC", "কুরআন", "অন্য"] as const;

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(60),
  subject: z.enum(SUBJECTS).default("অন্য"),
  templateId: z.string().trim().max(40).nullable().optional(),
  minutesPerDay: z.number().int().min(5).max(240).default(20),
  linkHabit: z.boolean().default(true),
  linkGoal: z.boolean().default(true),
});

/**
 * GET /api/learning — all tracks with aggregate meta + a summary block.
 */
export async function GET() {
  const user = await getOrCreateUser();
  const today = toDateKey(new Date());

  const rawTracks = await db.learningTrack.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      lessons: { select: { id: true, title: true, sortOrder: true, done: true } },
      cards: { select: { dueDate: true } },
    },
  });

  const tracks = rawTracks.map((t) => buildTrackMeta(t, t.lessons, t.cards, today));
  const active = tracks.filter((t) => !t.archived);

  // Reviews today: cards whose lastReviewedAt falls on today's key.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reviewsToday = await db.flashcard.count({
    where: { userId: user.id, lastReviewedAt: { gte: todayStart } },
  });

  // Practice streak: consecutive days (ending today) where any lesson of this
  // user was completed or any card reviewed. Walk backwards over lesson
  // doneAt dates + card lastReviewedAt dates.
  const lessonDays = await db.lesson.findMany({
    where: { userId: user.id, done: true, doneAt: { not: null } },
    select: { doneAt: true },
  });
  const cardDays = await db.flashcard.findMany({
    where: { userId: user.id, lastReviewedAt: { not: null } },
    select: { lastReviewedAt: true },
  });
  const activeDays = new Set<string>();
  for (const l of lessonDays) if (l.doneAt) activeDays.add(toDateKey(l.doneAt));
  for (const c of cardDays) if (c.lastReviewedAt) activeDays.add(toDateKey(c.lastReviewedAt));

  let streakDays = 0;
  const { addDays, fromDateKey } = await import("@/lib/date-bn");
  const todayDate = fromDateKey(today);
  for (let i = 0; i < 400; i++) {
    const key = toDateKey(addDays(todayDate, -i));
    if (activeDays.has(key)) streakDays += 1;
    else if (key === today) continue; // today not yet practiced ≠ broken
    else break;
  }

  const body: LearningResponse = {
    tracks,
    summary: {
      tracks: active.length,
      lessonsDone: active.reduce((s, t) => s + t.lessonsDone, 0),
      lessonsTotal: active.reduce((s, t) => s + t.lessonCount, 0),
      dueCards: active.reduce((s, t) => s + t.dueCards, 0),
      reviewsToday,
      streakDays,
    },
  };
  return NextResponse.json(body);
}

/**
 * POST /api/learning — create a track (optionally from a template with
 * seeded lessons + flashcards), optionally linking a habit & goal.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const { title, subject, templateId, minutesPerDay, linkHabit, linkGoal } = parsed.data;

  const template = templateId ? findTemplate(templateId) : undefined;
  const lessons = template?.lessons ?? [];
  const cards = template?.cards ?? [];

  // Optional linked habit: "আজ ২০ মিনিট আরবি" as a daily practice habit.
  let habitId: string | null = null;
  if (linkHabit) {
    const habit = await db.habit.create({
      data: {
        userId: user.id,
        name: `${title} — আজ ${minutesPerDay} মিনিট`,
        icon: template?.icon ?? "BookOpen",
        category: "পড়াশোনা ও জ্ঞান",
        color: template?.color ?? "#0d9488",
        target: "প্রতিদিন",
        frequency: "প্রতিদিন",
        timeOfDay: "সকাল",
        note: "শেখা মডিউল থেকে তৈরি — লেসন/রিভিউ শেষ হলে নিজে থেকেই টিক হবে।",
      },
    });
    habitId = habit.id;
  }

  const track = await db.learningTrack.create({
    data: {
      userId: user.id,
      title,
      subject: subject as LearningSubject,
      icon: template?.icon ?? "BookOpen",
      color: template?.color ?? "#0d9488",
      minutesPerDay,
      habitId,
      lessons: {
        create: lessons.map((l, i) => ({
          userId: user.id,
          title: l.title,
          content: l.content ?? null,
          sortOrder: i,
        })),
      },
      cards: {
        create: cards.map((c) => ({
          userId: user.id,
          front: c.front,
          back: c.back,
          dueDate: toDateKey(new Date()),
        })),
      },
    },
  });

  // Optional linked goal: progress = lessons done (one step per lesson).
  if (linkGoal && lessons.length > 0) {
    const { milestonesForDb } = await import("@/lib/goals-server");
    const milestones = [0.25, 0.5, 0.75, 1]
      .map((f) => Math.round(lessons.length * f))
      .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
      .map((v) => ({ title: `${v}টি লেসন শেষ`, value: v, done: false }));
    const goal = await db.goal.create({
      data: {
        userId: user.id,
        title: `${title} — সম্পূর্ণ শেখা`,
        category: "শেখা ও দক্ষতা",
        icon: template?.icon ?? "BookOpen",
        color: template?.color ?? "#0d9488",
        unit: "লেসন",
        targetValue: lessons.length,
        currentValue: 0,
        milestones: milestonesForDb(milestones),
        note: "শেখা মডিউল থেকে তৈরি — লেসন শেষ হলে অগ্রগতি নিজে থেকেই বাড়ে।",
      },
    });
    await db.learningTrack.update({ where: { id: track.id }, data: { goalId: goal.id } });
  }

  return NextResponse.json({ trackId: track.id }, { status: 201 });
}
