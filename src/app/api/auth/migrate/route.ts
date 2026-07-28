import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

export const dynamic = "force-dynamic";

const GUEST_USER_ID = "local-default-user";

/**
 * POST /api/auth/migrate — migrate guest user data to the authenticated user.
 *
 * When a guest user (using local-default-user) registers/logs in for the first time,
 * this endpoint moves all their habits, completions, prayers, quran sessions,
 * achievements, moods, and focus sessions to their new authenticated account.
 *
 * Idempotent: if the guest user has no data or already migrated, returns success.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "অনুমতি নেই" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId || userId === GUEST_USER_ID) {
    return NextResponse.json({ error: "অবৈধ ব্যবহারকারী" }, { status: 400 });
  }

  // Check if guest user exists and has data
  const guestUser = await db.user.findUnique({
    where: { id: GUEST_USER_ID },
  });

  if (!guestUser) {
    return NextResponse.json({ ok: true, migrated: false, reason: "no guest data" });
  }

  // Check if target user already has data (already migrated)
  const existingHabits = await db.habit.count({
    where: { userId },
  });
  if (existingHabits > 0) {
    return NextResponse.json({ ok: true, migrated: false, reason: "already has data" });
  }

  // Perform migration in a transaction
  const result = await db.$transaction(async (tx) => {
    // Migrate habits
    const habits = await tx.habit.findMany({
      where: { userId: GUEST_USER_ID },
    });
    const habitIdMap = new Map<string, string>();

    for (const h of habits) {
      const newHabit = await tx.habit.create({
        data: {
          userId,
          name: h.name,
          nameEn: h.nameEn,
          icon: h.icon,
          category: h.category,
          color: h.color,
          target: h.target,
          frequency: h.frequency,
          frequencyDays: h.frequencyDays,
          timesPerWeek: h.timesPerWeek,
          timeOfDay: h.timeOfDay,
          reminderTime: h.reminderTime,
          streak: h.streak,
          bestStreak: h.bestStreak,
          totalDone: h.totalDone,
          sortOrder: h.sortOrder,
          active: h.active,
          isIslamic: h.isIslamic,
          frozenDate: h.frozenDate,
          freezeUsedWeek: h.freezeUsedWeek,
        },
      });
      habitIdMap.set(h.id, newHabit.id);
    }

    // Migrate completions
    const completions = await tx.habitCompletion.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const c of completions) {
      const newHabitId = habitIdMap.get(c.habitId);
      if (newHabitId) {
        await tx.habitCompletion.create({
          data: {
            habitId: newHabitId,
            userId,
            date: c.date,
            note: c.note,
          },
        }).catch(() => {}); // skip duplicates
      }
    }

    // Migrate prayer records
    const prayers = await tx.prayerRecord.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const p of prayers) {
      await tx.prayerRecord.create({
        data: {
          userId,
          date: p.date,
          fajr: p.fajr,
          dhuhr: p.dhuhr,
          asr: p.asr,
          maghrib: p.maghrib,
          isha: p.isha,
          sunnahFajr: p.sunnahFajr,
          sunnahOther: p.sunnahOther,
          tahajjud: p.tahajjud,
        },
      }).catch(() => {});
    }

    // Migrate quran sessions
    const quranSessions = await tx.quranSession.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const q of quranSessions) {
      await tx.quranSession.create({
        data: {
          userId,
          date: q.date,
          surah: q.surah,
          fromAyah: q.fromAyah,
          toAyah: q.toAyah,
          pagesRead: q.pagesRead,
          juz: q.juz,
        },
      }).catch(() => {});
    }

    // Migrate achievements
    const achievements = await tx.achievement.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const a of achievements) {
      await tx.achievement.create({
        data: { userId, badgeId: a.badgeId },
      }).catch(() => {});
    }

    // Migrate mood entries
    const moods = await tx.moodEntry.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const m of moods) {
      await tx.moodEntry.create({
        data: {
          userId,
          date: m.date,
          mood: m.mood,
          note: m.note,
        },
      }).catch(() => {});
    }

    // Migrate focus sessions
    const focusSessions = await tx.focusSession.findMany({
      where: { userId: GUEST_USER_ID },
    });
    for (const f of focusSessions) {
      const newHabitId = f.habitId ? habitIdMap.get(f.habitId) ?? null : null;
      await tx.focusSession.create({
        data: {
          userId,
          habitId: newHabitId,
          date: f.date,
          durationMin: f.durationMin,
          type: f.type,
          tag: f.tag,
          completed: f.completed,
        },
      }).catch(() => {});
    }

    // Transfer XP and level from guest to new user
    await tx.user.update({
      where: { id: userId },
      data: {
        xp: guestUser.xp,
        level: guestUser.level,
        city: guestUser.city,
        settings: guestUser.settings,
      },
    });

    return {
      habits: habits.length,
      completions: completions.length,
      prayers: prayers.length,
      quranSessions: quranSessions.length,
      achievements: achievements.length,
      moods: moods.length,
      focusSessions: focusSessions.length,
    };
  });

  return NextResponse.json({
    ok: true,
    migrated: true,
    ...result,
  });
}
