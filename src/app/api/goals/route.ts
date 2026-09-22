import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { serializeGoal, milestonesForDb, deadlineBucket } from "@/lib/goals-server";
import type { GoalsResponse } from "@/types/goals";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(80),
  category: z.string().default("ব্যক্তিগত"),
  icon: z.string().default("Target"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#059669"),
  unit: z.string().trim().min(1).max(12).default("ধাপ"),
  targetValue: z.number().positive().max(1_000_000_000),
  deadline: z.string().nullable().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        value: z.number().min(0),
        done: z.boolean().default(false),
      })
    )
    .max(20)
    .default([]),
  note: z.string().trim().max(300).nullable().optional(),
});

/** Parse deadline — accepts "YYYY-MM-DD" or full ISO; null clears it. */
function parseDeadline(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * GET /api/goals — all goals (active first) + a summary block for Home.
 */
export async function GET() {
  const user = await getOrCreateUser();

  const rawGoals = await db.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ active: "desc" }, { completedAt: "asc" }, { createdAt: "desc" }],
  });

  const goals = rawGoals.map(serializeGoal);
  const active = goals.filter((g) => g.active && !g.completedAt);
  const completed = goals.filter((g) => !!g.completedAt);

  const overallProgress =
    active.length > 0
      ? active.reduce(
          (sum, g) => sum + (g.targetValue > 0 ? Math.min(1, g.currentValue / g.targetValue) : 0),
          0
        ) / active.length
      : 0;

  const buckets = active.map((g) => deadlineBucket(g.deadline));

  const body: GoalsResponse = {
    goals,
    summary: {
      active: active.length,
      completed: completed.length,
      overallProgress,
      dueSoon: buckets.filter((b) => b === "today" || b === "soon").length,
      overdue: buckets.filter((b) => b === "overdue").length,
    },
  };
  return NextResponse.json(body);
}

/**
 * POST /api/goals — create a new লক্ষ্য.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const { title, category, icon, color, unit, targetValue, deadline, milestones, note } =
    parsed.data;

  const goal = await db.goal.create({
    data: {
      userId: user.id,
      title,
      category,
      icon,
      color,
      unit,
      targetValue,
      currentValue: 0,
      deadline: parseDeadline(deadline),
      milestones: milestonesForDb(milestones),
      note: note ?? null,
      active: true,
    },
  });

  return NextResponse.json({ goal: serializeGoal(goal) }, { status: 201 });
}
