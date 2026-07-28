import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { serializeHabit } from "@/lib/habits-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/habits/archive — list all archived (soft-deleted) habits.
 */
export async function GET() {
  const user = await getOrCreateUser();
  const habits = await db.habit.findMany({
    where: { userId: user.id, active: false },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(habits.map(serializeHabit));
}

/**
 * POST /api/habits/archive — restore an archived habit.
 * Body: { id: string }
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "আইডি প্রয়োজন" }, { status: 400 });
  }

  const existing = await db.habit.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "পাওয়া যায়নি" }, { status: 404 });
  }

  const restored = await db.habit.update({
    where: { id },
    data: { active: true },
  });

  return NextResponse.json(serializeHabit(restored));
}
