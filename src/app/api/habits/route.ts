import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta, serializeHabit } from "@/lib/habits-server";

export const dynamic = "force-dynamic";

/** GET /api/habits — all habits enriched with today's completion + history */
export async function GET() {
  const habits = await getHabitsWithMeta();
  return NextResponse.json(habits);
}

const HabitCreateSchema = z.object({
  name: z.string().min(1).max(80),
  nameEn: z.string().max(80).optional().nullable(),
  icon: z.string().default("CheckCircle"),
  category: z.string().default("জীবনধারা"),
  color: z.string().default("#059669"),
  target: z.string().default("প্রতিদিন"),
  frequency: z.string().default("প্রতিদিন"),
  frequencyDays: z.array(z.number()).default([]),
  timesPerWeek: z.number().default(0),
  timeOfDay: z.string().default("সকাল"),
  reminderTime: z.string().nullable().optional(),
  isIslamic: z.boolean().default(false),
});

/** POST /api/habits — create a new habit */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = HabitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ ইনপুট", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const count = await db.habit.count({ where: { userId: user.id } });
  const habit = await db.habit.create({
    data: {
      userId: user.id,
      name: d.name,
      nameEn: d.nameEn ?? null,
      icon: d.icon,
      category: d.category,
      color: d.color,
      target: d.target,
      frequency: d.frequency,
      frequencyDays: JSON.stringify(d.frequencyDays),
      timesPerWeek: d.timesPerWeek,
      timeOfDay: d.timeOfDay,
      reminderTime: d.reminderTime ?? null,
      isIslamic: d.isIslamic,
      sortOrder: count,
    },
  });
  return NextResponse.json(serializeHabit(habit));
}
