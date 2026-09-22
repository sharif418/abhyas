import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { toDateKey, addDays, fromDateKey } from "@/lib/date-bn";
import {
  serializePlannerTask,
  sortTasks,
  buildWeekStrip,
  planStreakFrom,
  validDateOrToday,
  nextSortOrder,
} from "@/lib/planner-server";
import type { PlannerResponse } from "@/types/planner";

export const dynamic = "force-dynamic";

const MAX_MITS_PER_DAY = 3;
const MAX_TASKS_PER_DAY = 33; // 3 MIT + 30 todos

const CreateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  title: z.string().trim().min(2).max(120),
  isMit: z.boolean().default(false),
});

/**
 * GET /api/planner?date=YYYY-MM-DD — tasks for that date + 7-day strip
 * ending today + summary (progress, MIT status, plan-streak).
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const url = new URL(req.url);
  const date = validDateOrToday(url.searchParams.get("date"));
  const today = toDateKey(new Date());
  const weekStart = toDateKey(addDays(fromDateKey(today), -6));

  // Rows for the requested date (any date) OR the trailing week window.
  const rawTasks = await db.plannerTask.findMany({
    where: {
      userId: user.id,
      OR: [{ date }, { date: { gte: weekStart } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const tasks = sortTasks(rawTasks.filter((t) => t.date === date).map(serializePlannerTask));
  const weekRows = rawTasks.map((t) => ({ date: t.date, done: t.done }));
  const week = buildWeekStrip(today, weekRows);

  const mits = tasks.filter((t) => t.isMit);
  const doneCount = tasks.filter((t) => t.done).length;
  const mitsDone = mits.filter((t) => t.done).length;

  const body: PlannerResponse = {
    date,
    tasks,
    week,
    summary: {
      date,
      total: tasks.length,
      done: doneCount,
      mitsTotal: mits.length,
      mitsDone,
      allMitsDone: mits.length > 0 && mitsDone === mits.length,
      planStreak: planStreakFrom(today, weekRows),
    },
  };
  return NextResponse.json(body);
}

/**
 * POST /api/planner — add a planned item (MIT or todo) for a date.
 * Guards: ≤3 MITs and ≤33 tasks per day.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const { title, isMit } = parsed.data;
  const date = validDateOrToday(parsed.data.date ?? null);

  const existing = await db.plannerTask.findMany({
    where: { userId: user.id, date },
    select: { isMit: true, sortOrder: true },
  });

  if (isMit && existing.filter((t) => t.isMit).length >= MAX_MITS_PER_DAY) {
    return NextResponse.json(
      { error: "দিনে সর্বোচ্চ ৩টি প্রধান কাজ রাখা যায়" },
      { status: 400 }
    );
  }
  if (existing.length >= MAX_TASKS_PER_DAY) {
    return NextResponse.json(
      { error: "আজকের তালিকা পূর্ণ — কিছু কাজ সরিয়ে নিন" },
      { status: 400 }
    );
  }

  const task = await db.plannerTask.create({
    data: {
      userId: user.id,
      date,
      title,
      isMit,
      sortOrder: nextSortOrder(existing, isMit),
    },
  });

  return NextResponse.json({ task: serializePlannerTask(task) }, { status: 201 });
}
