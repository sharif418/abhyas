import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { serializeGoal, milestonesForDb } from "@/lib/goals-server";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  unit: z.string().trim().min(1).max(12).optional(),
  targetValue: z.number().positive().max(1_000_000_000).optional(),
  deadline: z.string().nullable().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        value: z.number().min(0),
        done: z.boolean(),
      })
    )
    .max(20)
    .optional(),
  note: z.string().trim().max(300).nullable().optional(),
  active: z.boolean().optional(),
});

/** PATCH /api/goals/[id] — edit goal fields (title, target, deadline, …). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const existing = await db.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "লক্ষ্য পাওয়া যায়নি" }, { status: 404 });
  }

  const d = parsed.data;
  const deadline =
    d.deadline === undefined
      ? undefined
      : d.deadline
        ? new Date(d.deadline)
        : null;

  const goal = await db.goal.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.color !== undefined ? { color: d.color } : {}),
      ...(d.unit !== undefined ? { unit: d.unit } : {}),
      ...(d.targetValue !== undefined ? { targetValue: d.targetValue } : {}),
      ...(deadline !== undefined ? { deadline } : {}),
      ...(d.milestones !== undefined ? { milestones: milestonesForDb(d.milestones) } : {}),
      ...(d.note !== undefined ? { note: d.note } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });

  return NextResponse.json({ goal: serializeGoal(goal) });
}

/** DELETE /api/goals/[id] — permanently remove a goal. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const existing = await db.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "লক্ষ্য পাওয়া যায়নি" }, { status: 404 });
  }

  await db.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
