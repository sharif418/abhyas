import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { prismaJson } from "@/lib/db-compat";
import { DEFAULT_SETTINGS } from "@/constants/settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/reset — REAL destructive reset of the current user's data.
 *
 * Deletes (in dependency-safe order):
 *   completions, prayer records, quran sessions, mood entries, focus
 *   sessions, achievements, habits, push subscriptions — and resets
 *   XP/level to zero with default settings.
 *
 * The profile UI pairs this with the unified ConfirmDialog so the copy
 * ("সবকিছু মুছে যাবে") finally matches what actually happens (the old
 * implementation only cleared localStorage and silently left all server
 * data intact).
 */
export async function POST() {
  const user = await getOrCreateUser();

  await db.$transaction([
    db.habitCompletion.deleteMany({ where: { userId: user.id } }),
    db.prayerRecord.deleteMany({ where: { userId: user.id } }),
    db.quranSession.deleteMany({ where: { userId: user.id } }),
    db.moodEntry.deleteMany({ where: { userId: user.id } }),
    db.focusSession.deleteMany({ where: { userId: user.id } }),
    db.achievement.deleteMany({ where: { userId: user.id } }),
    db.habit.deleteMany({ where: { userId: user.id } }),
    db.pushSubscription.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: {
        xp: 0,
        level: 1,
        settings: prismaJson(DEFAULT_SETTINGS),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
