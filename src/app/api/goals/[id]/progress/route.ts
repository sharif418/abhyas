import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { applyProgress, serializeGoal, xpForProgress, milestonesForDb } from "@/lib/goals-server";
import { deserializeJson } from "@/lib/db-compat";
import type { GoalMilestone, GoalProgressResponse } from "@/types/goals";

export const dynamic = "force-dynamic";

const ProgressSchema = z.object({
  /** Signed delta in goal units — negative corrects over-logs. */
  delta: z.number().min(-1_000_000_000).max(1_000_000_000),
});

/**
 * POST /api/goals/[id]/progress — log progress toward a লক্ষ্য.
 *
 * Applies the delta (clamped to the target), auto-completes reached
 * milestones, awards XP (capped per log + completion bonus) and marks the
 * goal completed exactly once.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const existing = await db.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "লক্ষ্য পাওয়া যায়নি" }, { status: 404 });
  }

  const milestones = deserializeJson<GoalMilestone[]>(existing.milestones) ?? [];
  const result = applyProgress(
    {
      targetValue: existing.targetValue,
      currentValue: existing.currentValue,
      milestones,
      completedAt: existing.completedAt,
    },
    parsed.data.delta
  );

  const xpAwarded = xpForProgress(parsed.data.delta, result.completed);

  let totalXp = user.xp;
  let newLevel = user.level;
  if (xpAwarded > 0) {
    totalXp = user.xp + xpAwarded;
    const { levelFromXp } = await import("@/lib/gamification");
    newLevel = levelFromXp(totalXp);
    await db.user.update({
      where: { id: user.id },
      data: { xp: totalXp, level: newLevel },
    });
  }

  const goal = await db.goal.update({
    where: { id },
    data: {
      currentValue: result.currentValue,
      milestones: milestonesForDb(result.milestones),
      ...(result.completed ? { completedAt: new Date(), active: false } : {}),
      ...(result.currentValue < existing.targetValue && existing.completedAt
        ? { completedAt: null, active: true } // un-complete on correction
        : {}),
    },
  });

  const res: GoalProgressResponse = {
    goal: serializeGoal(goal),
    xpAwarded,
    totalXp,
    level: newLevel,
    leveledUp: newLevel > user.level,
    newlyCompletedMilestones: result.newlyCompletedMilestones,
    goalCompleted: result.completed,
  };
  return NextResponse.json(res);
}
