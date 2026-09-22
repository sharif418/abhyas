import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { serializePlannerTask } from "@/lib/planner-server";
import { PLANNER_XP } from "@/types/planner";
import type { PlannerToggleResponse } from "@/types/planner";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  isMit: z.boolean().optional(),
});

/**
 * PATCH /api/planner/[id] — toggle completion / rename / promote-demote.
 *
 * XP rules (symmetric & honest):
 *   • completing a MIT +6, a todo +4 (only on the false→true transition)
 *   • un-completing reverses the same amount (user XP floored at 0)
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const task = await db.plannerTask.findFirst({ where: { id, userId: user.id } });
  if (!task) {
    return NextResponse.json({ error: "কাজটি পাওয়া যায়নি" }, { status: 404 });
  }

  const { done, title, isMit } = parsed.data;

  // MIT-slot guard on promote (isMit true→) when 3 MITs already exist.
  if (isMit === true && !task.isMit) {
    const mits = await db.plannerTask.count({
      where: { userId: user.id, date: task.date, isMit: true },
    });
    if (mits >= 3) {
      return NextResponse.json(
        { error: "দিনে সর্বোচ্চ ৩টি প্রধান কাজ রাখা যায়" },
        { status: 400 }
      );
    }
  }

  // Signed XP delta for the completion transition.
  let xpAwarded = 0;
  const completing = done !== undefined && done !== task.done;
  if (completing) {
    const base = task.isMit ? PLANNER_XP.mit : PLANNER_XP.todo;
    xpAwarded = done ? base : -base;
  }

  let totalXp = user.xp;
  let newLevel = user.level;
  if (xpAwarded !== 0) {
    totalXp = Math.max(0, user.xp + xpAwarded);
    const { levelFromXp } = await import("@/lib/gamification");
    newLevel = levelFromXp(totalXp);
    await db.user.update({
      where: { id: user.id },
      data: { xp: totalXp, level: newLevel },
    });
  }

  const updated = await db.plannerTask.update({
    where: { id },
    data: {
      ...(done !== undefined ? { done, doneAt: done ? new Date() : null } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(isMit !== undefined ? { isMit } : {}),
    },
  });

  // All-MIT-done check for the celebration hint (after this update).
  const dayTasks = await db.plannerTask.findMany({
    where: { userId: user.id, date: task.date },
    select: { isMit: true, done: true },
  });
  const dayMits = dayTasks.filter((t) => t.isMit);
  const allMitsDone = dayMits.length > 0 && dayMits.every((t) => t.done);

  const res: PlannerToggleResponse = {
    task: serializePlannerTask(updated),
    xpAwarded,
    totalXp,
    level: newLevel,
    leveledUp: newLevel > user.level,
    allMitsDone,
  };
  return NextResponse.json(res);
}

/** DELETE /api/planner/[id] — remove a planned item. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const task = await db.plannerTask.findFirst({ where: { id, userId: user.id } });
  if (!task) {
    return NextResponse.json({ error: "কাজটি পাওয়া যায়নি" }, { status: 404 });
  }
  await db.plannerTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
