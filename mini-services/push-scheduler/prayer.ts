/**
 * অভ্যাস Push Scheduler — prayer-time Web Push (PWA users).
 *
 * The Android app's reminders come from the NATIVE alarm engine
 * (AlarmManager + offline PrayerTimesCalc — see android/). PWA users get
 * prayer-time reminders HERE instead, so both platforms enjoy the feature:
 *
 *   • computes today's prayer times with the SAME PrayTimes MWL algorithm
 *     (Fajr 18°, Isha 17°, Shafi Asr) as the native engine — verified to
 *     match Aladhan method 3 within 1 minute across cities and seasons;
 *   • fires when the current Dhaka minute reaches (prayer − offset),
 *     with a 2-minute catch-up window so a scheduler restart never loses
 *     a prayer (in-memory per-day dedup prevents double sends);
 *   • honors the user's settings (prayerAlarmsEnabled, per-prayer toggles,
 *     pre-alert offset — missing keys = defaults, opt-out model);
 *   • TTL 30 minutes (a late prayer reminder is noise), urgency high.
 */

import type { PushSubscription } from "@prisma/client";
import { db, log, getCurrentTimeStr, getTodayStr, parseUserSettings, sendToSubscriptions } from "./shared";

// ---------------------------------------------------------------------------
// Bangladesh cities (compact copy of src/constants/misc.ts BD_CITIES)
// ---------------------------------------------------------------------------

const BD_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "ঢাকা", lat: 23.8103, lng: 90.4125 },
  { name: "চট্টগ্রাম", lat: 22.3569, lng: 91.7832 },
  { name: "রাজশাহী", lat: 24.3636, lng: 88.6241 },
  { name: "খুলনা", lat: 22.8456, lng: 89.5403 },
  { name: "সিলেট", lat: 24.8949, lng: 91.8687 },
  { name: "বরিশাল", lat: 22.701, lng: 90.3535 },
  { name: "রংপুর", lat: 25.7439, lng: 89.2752 },
  { name: "ময়মনসিংহ", lat: 24.7471, lng: 90.4203 },
  { name: "কুমিল্লা", lat: 23.4683, lng: 91.1786 },
  { name: "নারায়ণগঞ্জ", lat: 23.6238, lng: 90.4963 },
  { name: "গাজীপুর", lat: 24.0023, lng: 90.4264 },
  { name: "জামালপুর", lat: 24.9374, lng: 89.9388 },
];

const PRAYER_LABELS_BN: Record<string, string> = {
  fajr: "ফজর",
  dhuhr: "যোহর",
  asr: "আসর",
  maghrib: "মাগরিব",
  isha: "এশা",
};

const ALL_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Minutes a fired prayer may be late and still be worth sending. */
const CATCHUP_WINDOW_MIN = 2;

// ---------------------------------------------------------------------------
// PrayTimes MWL algorithm (mirrors android PrayerTimesCalc.java exactly)
// ---------------------------------------------------------------------------

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const dsin = (d: number) => Math.sin(d * D2R);
const dcos = (d: number) => Math.cos(d * D2R);
const fix = (a: number, b: number) => {
  let x = a - b * Math.floor(a / b);
  if (x < 0) x += b;
  return x;
};

function julianDate(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function solarPosition(jd: number): { decl: number; eqHours: number } {
  const d = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * d, 360);
  const q = fix(280.459 + 0.98564736 * d, 360);
  const L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360);
  const e = 23.439 - 0.00000036 * d;
  const ra = fix(Math.atan2(dcos(e) * dsin(L), dcos(L)) * R2D / 15.0, 24);
  const decl = Math.asin(dsin(e) * dsin(L)) * R2D;
  return { decl, eqHours: q / 15.0 - ra };
}

function twilightHours(lat: number, decl: number, angle: number): number {
  const a = -dsin(angle) - dsin(lat) * dsin(decl);
  const b = dcos(lat) * dcos(decl);
  const c = a / b;
  if (c < -1 || c > 1) return NaN;
  return (Math.acos(c) * R2D) / 15.0;
}

/** Bangladesh is UTC+6 with no DST — a fixed offset keeps this honest. */
const DHAKA_OFFSET_MIN = 360;

/**
 * The five prayer times as minutes-of-day in Asia/Dhaka. Order-safe map;
 * a prayer missing at extreme latitudes is simply absent.
 */
export function prayerMinutes(y: number, m: number, d: number, lat: number, lng: number) {
  const jd = julianDate(y, m, d) - lng / (15 * 24);
  const { decl, eqHours } = solarPosition(jd + 0.5);
  const noonH = 12.0 - eqHours;
  const tz = (h: number) => h * 60 + DHAKA_OFFSET_MIN - (lng / 15.0) * 60.0;

  const noonShadow = Math.tan(Math.abs(lat - decl) * D2R);
  const asrAlt = Math.atan(1.0 / (1.0 + noonShadow)) * R2D;

  const t = (angle: number) => twilightHours(lat, decl, angle);
  const tAsr = (() => {
    const a = dsin(asrAlt) - dsin(lat) * dsin(decl);
    const b = dcos(lat) * dcos(decl);
    const c = a / b;
    if (c < -1 || c > 1) return NaN;
    return (Math.acos(c) * R2D) / 15.0;
  })();

  return {
    fajr: tz(noonH - t(18.0)),
    sunrise: tz(noonH - t(0.833)),
    dhuhr: tz(noonH),
    asr: tz(noonH + tAsr),
    maghrib: tz(noonH + t(0.833)),
    isha: tz(noonH + t(17.0)),
  };
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

interface PrayerSettingsRow {
  prayerAlarmsEnabled?: boolean;
  prayerAlarmOffsetMin?: number;
  prayerAlarmPrayers?: string[];
  notificationsEnabled?: boolean;
}

/** date-key → {lat,lng} → times (tiny cache; recomputed at most once/city/day). */
const timesCache = new Map<string, Map<string, ReturnType<typeof prayerMinutes>>>();

/** user+prayer+date dedup (in-memory; restart-safe via the catch-up window). */
const sent = new Set<string>();

export interface PrayerResult {
  users: number;
  sent: number;
}

export async function prayerTick(): Promise<PrayerResult> {
  const result: PrayerResult = { users: 0, sent: 0 };

  const today = getTodayStr();
  const [y, m, d] = today.split("-").map(Number);
  const nowMin = (() => {
    const [h, mm] = getCurrentTimeStr().split(":").map(Number);
    return h * 60 + mm;
  })();

  // Every user with at least one live subscription (settings filter below).
  const users = await db.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: {
      id: true,
      city: true,
      settings: true,
      pushSubscriptions: true,
    },
  });
  if (users.length === 0) return result;
  result.users = users.length;

  const cityCache = timesCache.get(today) ?? new Map();
  timesCache.set(today, cityCache);
  // keep only today's entry (yesterday's cache is dead weight)
  if (timesCache.size > 1) {
    for (const key of timesCache.keys()) if (key !== today) timesCache.delete(key);
  }

  for (const user of users) {
    const settings = parseUserSettings(user.settings) as PrayerSettingsRow;

    // Opt-out model: missing keys = defaults (alarms ON, no offset, all five).
    if (settings.prayerAlarmsEnabled === false || settings.notificationsEnabled === false) {
      continue;
    }

    const offset = Math.max(0, Math.min(30, settings.prayerAlarmOffsetMin ?? 0));
    const enabled =
      Array.isArray(settings.prayerAlarmPrayers) && settings.prayerAlarmPrayers.length > 0
        ? settings.prayerAlarmPrayers
        : ALL_PRAYERS;

    const city = BD_CITIES.find((c) => c.name === user.city) ?? BD_CITIES[0];
    const cacheKey = `${city.lat.toFixed(4)},${city.lng.toFixed(4)}`;
    const times = cityCache.get(cacheKey) ?? prayerMinutes(y, m, d, city.lat, city.lng);
    cityCache.set(cacheKey, times);

    for (const key of enabled) {
      const fireMin = times[key] - offset;
      if (!Number.isFinite(fireMin)) continue;
      const late = nowMin - Math.round(fireMin);
      if (late < 0 || late > CATCHUP_WINDOW_MIN) continue;

      const dedupKey = `${user.id}:${key}:${today}`;
      if (sent.has(dedupKey)) continue;
      sent.add(dedupKey);

      // Bound the dedup set (prune yesterday's keys occasionally).
      if (sent.size > 5000) {
        for (const k of sent) if (!k.endsWith(today)) sent.delete(k);
      }

      const label = PRAYER_LABELS_BN[key] ?? key;
      const subscriptions: PushSubscription[] = user.pushSubscriptions;
      const res = await sendToSubscriptions(
        subscriptions,
        {
          title: `${label} নামাজের সময়`,
          body:
            offset > 0
              ? `প্রস্তুতি নিন — ${toBnStr(offset)} মিনিট পর ${label} শুরু হবে`
              : `ওয়াক্ত শুরু হয়েছে — ইবাদতে মন দিন`,
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: `prayer-${key}-${today}`, // ≤32 URL-safe chars → real collapse key
          data: { url: "/" },
        },
        30 * 60, // 30-minute TTL
        "high"
      );
      result.sent += res.sent;

      if (res.sent > 0) {
        log(`Prayer: ${label} → user ${user.id.slice(0, 8)}… (${res.sent} device(s))`);
      }
    }
  }

  return result;
}

/** Latin digits → Bengali digits (local copy; shared.ts toBn is for numbers). */
function toBnStr(n: number): string {
  const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(n)
    .split("")
    .map((c) => (c >= "0" && c <= "9" ? BN[Number(c)] : c))
    .join("");
}
