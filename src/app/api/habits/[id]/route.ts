import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { serializeHabit } from "@/lib/habits-server";

export const dynamic = "force-dynamic";

const HabitUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  nameEn: z.string().max(80).nullable().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  color: z.string().optional(),
  target: z.string().optional(),
  frequency: z.string().optional(),
  frequencyDays: z.array(z.number()).optional(),
  timesPerWeek: z.number().optional(),
  timeOfDay: z.string().optional(),
  reminderTime: z.string().nullable().optional(),
  isIslamic: z.boolean().optional(),
  active: z.boolean().optional(),
});

/** PUT /api/habits/:id — update a habit */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = HabitUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ ইনপুট", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const existing = await db.habit.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "পাওয়া যায়নি" }, { status: 404 });
  }
  const updated = await db.habit.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.nameEn !== undefined ? { nameEn: d.nameEn } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.color !== undefined ? { color: d.color } : {}),
      ...(d.target !== undefined ? { target: d.target } : {}),
      ...(d.frequency !== undefined ? { frequency: d.frequency } : {}),
      ...(d.frequencyDays !== undefined
        ? { frequencyDays: JSON.stringify(d.frequencyDays) }
        : {}),
      ...(d.timesPerWeek !== undefined ? { timesPerWeek: d.timesPerWeek } : {}),
      ...(d.timeOfDay !== undefined ? { timeOfDay: d.timeOfDay } : {}),
      ...(d.reminderTime !== undefined ? { reminderTime: d.reminderTime } : {}),
      ...(d.isIslamic !== undefined ? { isIslamic: d.isIslamic } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  return NextResponse.json(serializeHabit(updated));
}

/** DELETE /api/habits/:id — soft delete (archive) to preserve history */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const existing = await db.habit.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "পাওয়া যায়নি" }, { status: 404 });
  }
  // Soft delete: set active=false to preserve completion history for stats
  await db.habit.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
