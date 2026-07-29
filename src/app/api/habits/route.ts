import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta, serializeHabit } from "@/lib/habits-server";
import { serializeArray } from "@/lib/db-compat";

export const dynamic = "force-dynamic";

/** GET /api/habits — all habits enriched with today's completion + history */
export async function GET() {
  const habits = await getHabitsWithMeta();
  return NextResponse.json(habits);
}

const CATEGORIES = [
  "প্রার্থনা ও ইবাদত",
  "স্বাস্থ্য ও ফিটনেস",
  "পড়াশোনা ও জ্ঞান",
  "কাজ ও পেশা",
  "পরিবার ও সম্পর্ক",
  "অর্থনীতি ও সঞ্চয়",
  "মানসিক সুস্থতা",
  "জীবনধারা",
] as const;

const FREQUENCIES = ["প্রতিদিন", "নির্দিষ্ট দিন", "সপ্তাহে কয়েকবার", "মাসে একবার"] as const;
const TIMES_OF_DAY = ["সকাল", "দুপুর", "বিকাল", "রাত"] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

const HabitCreateSchema = z.object({
  name: z.string().min(1).max(80),
  nameEn: z.string().max(80).optional().nullable(),
  icon: z.string().min(1).max(60).default("CheckCircle"),
  category: z.enum(CATEGORIES).default("জীবনধারা"),
  color: z.string().regex(HEX_COLOR).default("#059669"),
  target: z.string().max(40).default("প্রতিদিন"),
  frequency: z.enum(FREQUENCIES).default("প্রতিদিন"),
  frequencyDays: z.array(z.number().int().min(0).max(6)).default([]),
  timesPerWeek: z.number().int().min(0).max(7).default(0),
  timeOfDay: z.enum(TIMES_OF_DAY).default("সকাল"),
  reminderTime: z.string().regex(TIME_FORMAT).nullable().optional(),
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
      frequencyDays: serializeArray(d.frequencyDays) as any,
      timesPerWeek: d.timesPerWeek,
      timeOfDay: d.timeOfDay,
      reminderTime: d.reminderTime ?? null,
      isIslamic: d.isIslamic,
      sortOrder: count,
    },
  });
  return NextResponse.json(serializeHabit(habit));
}
