import type { AlarmPrayerKey, AlarmSpec, PrayerAlarmConfig } from "@/lib/native/alarm-plugin";
import type { HabitWithMeta, PrayerTimes, UserSettings } from "@/types";
import { isScheduledOn } from "@/lib/streaks";
import { toBn, todayKey } from "@/lib/date-bn";

/**
 * The alarm PLAN builder — pure, testable, platform-free.
 *
 * "Brain in Web, Muscle in Native": this module decides WHAT should ring
 * and WHEN; the NativeAlarm plugin owns exact delivery. The plan has two
 * parts:
 *
 *  1. habitAlarms — explicit AlarmSpecs for habit L1 reminders (today's
 *     still-open + tomorrow's scheduled), because habits are user data the
 *     native side can never recompute on its own.
 *  2. prayerConfig — a self-contained recipe (city, offset, toggles) that
 *     lets the native PrayerTimesCalc engine own prayer alarms forever:
 *     today's authoritative server times are embedded, and beyond that the
 *     engine recomputes offline — surviving reboots with zero network.
 *
 * Nothing here touches Capacitor — the hook feeds it state and hands the
 * result to the plugin.
 */

/** Days of habit reminders to keep scheduled ahead (reboot cushion). */
const HABIT_HORIZON_DAYS = 2;
/** Days of prayer alarms the native engine keeps scheduled ahead. */
export const PRAYER_HORIZON_DAYS = 3;
/** DND minutes when prayer auto-silence is enabled. */
export const PRAYER_SILENCE_MINUTES = 15;

export interface AlarmPlan {
  habitAlarms: AlarmSpec[];
  prayerConfig: PrayerAlarmConfig | null;
}

export interface AlarmPlanInput {
  settings: Pick<
    UserSettings,
    | "notificationsEnabled"
    | "remindersEnabled"
    | "prayerAlarmsEnabled"
    | "prayerAlarmOffsetMin"
    | "prayerAlarmPrayers"
    | "prayerAutoSilenceEnabled"
  >;
  habits: HabitWithMeta[];
  /** Today's server-authoritative prayer times (undefined = unavailable). */
  prayerTimes?: PrayerTimes;
  city: { name: string; lat: number; lng: number };
  now?: Date;
}

const PRAYER_KEYS: AlarmPrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export function buildAlarmPlan(input: AlarmPlanInput): AlarmPlan {
  const now = input.now ?? new Date();

  const habitAlarms = buildHabitAlarms(input, now);
  const prayerConfig = buildPrayerConfig(input, now);

  return { habitAlarms, prayerConfig };
}

// ---------------------------------------------------------------------------
// Habit L1 alarms — today (still open) + tomorrow (all scheduled)
// ---------------------------------------------------------------------------

function buildHabitAlarms(input: AlarmPlanInput, now: Date): AlarmSpec[] {
  const { settings, habits } = input;
  // Master notification switch or the reminder switch is off → nothing.
  if (!settings.notificationsEnabled || !settings.remindersEnabled) return [];

  const specs: AlarmSpec[] = [];

  for (let dayOffset = 0; dayOffset < HABIT_HORIZON_DAYS; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const dayKey = todayKey(day);

    for (const habit of habits) {
      if (!habit.active) continue;
      if (!habit.reminderTime) continue;
      // Only habits scheduled on this day get a reminder.
      if (!isScheduledOn(habit, day)) continue;

      // Today: skip habits already completed (no reminder after success).
      if (dayOffset === 0 && habit.completedToday) continue;

      const [h, m] = habit.reminderTime.split(":").map(Number);
      const at = new Date(day);
      at.setHours(h, m, 0, 0);
      // Only schedule future alarms (the native side double-checks too).
      if (at.getTime() <= now.getTime()) continue;

      specs.push({
        id: `habit-${habit.id}-${dayKey}`,
        kind: "habit",
        at: at.getTime(),
        title: habit.name,
        body:
          habit.streak >= 1
            ? `এটি সম্পন্ন করার সময় হয়েছে। স্ট্রিক: ${toBn(habit.streak)} দিন`
            : "এটি সম্পন্ন করার সময় হয়েছে",
        channel: "habits",
        habitId: habit.id,
        habitDate: dayKey,
        streak: habit.streak,
      });
    }
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Prayer alarm config — the offline recipe for the native engine
// ---------------------------------------------------------------------------

function buildPrayerConfig(input: AlarmPlanInput, now: Date): PrayerAlarmConfig | null {
  const { settings, prayerTimes, city } = input;
  if (!settings.notificationsEnabled || !settings.prayerAlarmsEnabled) return null;

  const enabled = PRAYER_KEYS.filter((key) =>
    (settings.prayerAlarmPrayers ?? PRAYER_KEYS).includes(key)
  );
  if (enabled.length === 0) return null;

  const offset = Math.max(0, Math.min(30, settings.prayerAlarmOffsetMin ?? 0));

  return {
    city: city.name,
    lat: city.lat,
    lng: city.lng,
    offsetMin: offset,
    prayers: enabled,
    autoSilence: settings.prayerAutoSilenceEnabled === true,
    silenceMinutes: PRAYER_SILENCE_MINUTES,
    horizonDays: PRAYER_HORIZON_DAYS,
    // Today's authoritative server times (Aladhan) embedded for exactness;
    // beyond today the native calculator takes over (offline survival).
    ...buildTodayTimes(prayerTimes, now),
  };
}

/** Embed today's server times when available (same keys the Java side reads). */
function buildTodayTimes(
  prayerTimes: PrayerTimes | undefined,
  now: Date
): Pick<PrayerAlarmConfig, "todayTimes"> {
  if (!prayerTimes?.Fajr) return { todayTimes: null };
  return {
    todayTimes: {
      date: todayKey(now),
      fajr: prayerTimes.Fajr,
      dhuhr: prayerTimes.Dhuhr,
      asr: prayerTimes.Asr,
      maghrib: prayerTimes.Maghrib,
      isha: prayerTimes.Isha,
    },
  };
}
