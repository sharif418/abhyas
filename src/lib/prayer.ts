import type { PrayerTimes } from "@/types";
import { PRAYERS } from "@/constants";
import { bnDuration } from "./date-bn";

/**
 * Prayer-time helpers: next prayer, countdown, progress through the day.
 * Times come from the Aladhan API (cached server-side).
 */

export interface NextPrayer {
  key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  label: string;
  emoji: string;
  time: string; // HH:mm
  /** ms until that prayer (negative = already passed today → next is tomorrow's Fajr) */
  msUntil: number;
  isTomorrow: boolean;
}

function parseTodayTime(hhmm: string, base: Date): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function getNextPrayer(times: PrayerTimes, now: Date = new Date()): NextPrayer {
  const order: NextPrayer["key"][] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const map: Record<NextPrayer["key"], string> = {
    fajr: times.Fajr,
    dhuhr: times.Dhuhr,
    asr: times.Asr,
    maghrib: times.Maghrib,
    isha: times.Isha,
  };

  for (const key of order) {
    const t = parseTodayTime(map[key], now);
    if (t.getTime() > now.getTime()) {
      const meta = PRAYERS.find((p) => p.key === key)!;
      return {
        key,
        label: meta.label,
        emoji: meta.emoji,
        time: map[key],
        msUntil: t.getTime() - now.getTime(),
        isTomorrow: false,
      };
    }
  }

  // all passed → next is tomorrow's Fajr
  const meta = PRAYERS.find((p) => p.key === "fajr")!;
  const tomorrowFajr = times.tomorrowFajr ?? times.Fajr;
  const t = parseTodayTime(tomorrowFajr, now);
  t.setDate(t.getDate() + 1);
  return {
    key: "fajr",
    label: meta.label,
    emoji: meta.emoji,
    time: tomorrowFajr,
    msUntil: t.getTime() - now.getTime(),
    isTomorrow: true,
  };
}

/** "পরবর্তী: যোহর — ২ ঘণ্টা ১৫ মিনিট পর" */
export function nextPrayerSummary(next: NextPrayer): string {
  return `পরবর্তী: ${next.label} — ${bnDuration(next.msUntil)} পর`;
}

/** Which prayer is "current" (the most recent one that has started). */
export function currentPrayerKey(
  times: PrayerTimes,
  now: Date = new Date()
): "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "isha-night" {
  const order = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const map = {
    fajr: times.Fajr,
    dhuhr: times.Dhuhr,
    asr: times.Asr,
    maghrib: times.Maghrib,
    isha: times.Isha,
  };
  let current: "isha-night" = "isha-night";
  for (const key of order) {
    const t = parseTodayTime(map[key], now);
    if (t.getTime() <= now.getTime()) current = key;
  }
  return current;
}
