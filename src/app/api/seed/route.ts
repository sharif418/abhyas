import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey, toDateKey, addDays } from "@/lib/date-bn";
import { prismaArray } from "@/lib/db-compat";

export const dynamic = "force-dynamic";

interface SeedHabit {
  name: string;
  icon: string;
  category: string;
  color: string;
  timeOfDay: string;
  frequency: string;
  frequencyDays: number[];
  isIslamic: boolean;
}

const SEED_HABITS: SeedHabit[] = [
  { name: "ফজরের নামাজ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
  { name: "কুরআন তিলাওয়াত", icon: "BookOpen", category: "প্রার্থনা ও ইবাদত", color: "#059669", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
  { name: "সকালের ব্যায়াম", icon: "Dumbbell", category: "স্বাস্থ্য ও ফিটনেস", color: "#16a34a", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
  { name: "পানি পান (৮ গ্লাস)", icon: "Droplets", category: "স্বাস্থ্য ও ফিটনেস", color: "#0284c7", timeOfDay: "দুপুর", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
  { name: "পড়াশোনা (১ ঘণ্টা)", icon: "BookOpen", category: "পড়াশোনা ও জ্ঞান", color: "#7c3aed", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
  { name: "যোহরের নামাজ", icon: "Sun", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "দুপুর", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
  { name: "মাগরিবের নামাজ", icon: "Sunset", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
  { name: "ডায়েরি লেখা", icon: "PenLine", category: "মানসিক সুস্থতা", color: "#9333ea", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
  { name: "তাহাজ্জুদ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
  { name: "ঘুমানোর আগে দোয়া", icon: "BedDouble", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
];

/** POST /api/seed — populate sample habits + a few weeks of history (idempotent) */
export async function POST() {
  const user = await getOrCreateUser();
  const existing = await db.habit.count({ where: { userId: user.id } });
  if (existing > 0) {
    return NextResponse.json({ ok: true, seeded: false, message: "already seeded" });
  }

  const today = new Date();

  for (let i = 0; i < SEED_HABITS.length; i++) {
    const s = SEED_HABITS[i];
    const habit = await db.habit.create({
      data: {
        userId: user.id,
        name: s.name,
        icon: s.icon,
        category: s.category,
        color: s.color,
        target: "প্রতিদিন",
        frequency: s.frequency,
        frequencyDays: prismaArray(s.frequencyDays ?? []),
        timesPerWeek: 0,
        timeOfDay: s.timeOfDay,
        isIslamic: s.isIslamic,
        sortOrder: i,
      },
    });

    // backfill ~21 days of partial history to make heatmaps look alive
    for (let d = 21; d >= 1; d--) {
      // ~70% completion probability, weighted by recency
      const prob = 0.55 + (21 - d) * 0.015;
      if (Math.random() < prob) {
        const date = toDateKey(addDays(today, -d));
        await db.habitCompletion
          .create({ data: { habitId: habit.id, userId: user.id, date } })
          .catch(() => {});
      }
    }
    // randomly complete today for a couple habits
    if (Math.random() < 0.4) {
      await db.habitCompletion
        .create({ data: { habitId: habit.id, userId: user.id, date: todayKey() } })
        .catch(() => {});
    }
  }

  // seed a couple of badges
  await db.achievement.create({ data: { userId: user.id, badgeId: "first_step" } }).catch(() => {});

  // seed some prayer records for the last week
  for (let d = 7; d >= 1; d--) {
    if (Math.random() < 0.6) {
      const date = toDateKey(addDays(today, -d));
      await db.prayerRecord
        .create({
          data: {
            userId: user.id,
            date,
            fajr: Math.random() < 0.7,
            dhuhr: Math.random() < 0.6,
            asr: Math.random() < 0.5,
            maghrib: Math.random() < 0.8,
            isha: Math.random() < 0.65,
          },
        })
        .catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, seeded: true, count: SEED_HABITS.length });
}
