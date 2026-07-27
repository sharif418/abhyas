import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const Schema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

/**
 * POST /api/habits/reorder — persist a new ordering of habit ids.
 * Updates sortOrder for each habit atomically within a transaction.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  // Verify all habits belong to the user
  const owned = await db.habit.findMany({
    where: { userId: user.id, id: { in: parsed.data.orderedIds } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((h) => h.id));
  const valid = parsed.data.orderedIds.filter((id) => ownedSet.has(id));
  if (valid.length === 0) {
    return NextResponse.json({ error: "কোনো বৈধ অভ্যাস নেই" }, { status: 400 });
  }

  await db.$transaction(
    valid.map((id, idx) =>
      db.habit.update({ where: { id }, data: { sortOrder: idx } })
    )
  );

  return NextResponse.json({ ok: true, count: valid.length });
}
