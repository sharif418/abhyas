import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { BD_CITIES } from "@/constants";
import { todayKey, toDateKey, addDays } from "@/lib/date-bn";
import type { PrayerTimes } from "@/types";

export const dynamic = "force-dynamic";

const Schema = z.object({
  city: z.string().min(1).default("ঢাকা"),
});

/**
 * GET /api/prayer/times?city=ঢাকা
 * Fetches today's prayer times via the Aladhan API, cached in the DB
 * (PrayerTimeCache) to minimize external calls. Also fetches tomorrow's
 * Fajr so the client can show "next prayer" after Isha.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = Schema.safeParse({
    city: searchParams.get("city") ?? "ঢাকা",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "শহর প্রয়োজন" }, { status: 400 });
  }
  const city = parsed.data.city;
  const meta = BD_CITIES.find((c) => c.name === city) ?? BD_CITIES[0];
  const method = 3; // Muslim World League

  const today = todayKey();
  const cached = await db.prayerTimeCache.findUnique({
    where: { date_lat_lng_method: { date: today, lat: meta.lat, lng: meta.lng, method } },
  });

  let times: PrayerTimes;
  if (cached) {
    times = buildFromCache(cached.times, meta, today);
  } else {
    try {
      times = await fetchFromAladhan(meta, method, today);
    } catch {
      // graceful fallback: static estimate
      times = fallbackTimes(meta, today);
    }
  }

  // prefetch tomorrow's Fajr for "next prayer" calc
  if (!times.tomorrowFajr) {
    const tomorrow = toDateKey(addDays(new Date(), 1));
    const tomCache = await db.prayerTimeCache.findUnique({
      where: { date_lat_lng_method: { date: tomorrow, lat: meta.lat, lng: meta.lng, method } },
    });
    if (tomCache) {
      const tom = typeof tomCache.times === "string" ? JSON.parse(tomCache.times) : tomCache.times;
      times.tomorrowFajr = tom.Fajr;
    } else {
      try {
        const tom = await fetchFromAladhan(meta, method, tomorrow);
        times.tomorrowFajr = tom.Fajr;
      } catch {
        times.tomorrowFajr = times.Fajr;
      }
    }
  }

  return NextResponse.json(times);
}

function buildFromCache(raw: any, meta: { name: string; lat: number; lng: number }, date: string): PrayerTimes {
  const t = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    date,
    city: meta.name,
    lat: meta.lat,
    lng: meta.lng,
    Fajr: t.Fajr,
    Sunrise: t.Sunrise,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
}

async function fetchFromAladhan(
  meta: { name: string; lat: number; lng: number },
  method: number,
  date: string
): Promise<PrayerTimes> {
  const [y, m, d] = date.split("-");
  const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${meta.lat}&longitude=${meta.lng}&method=${method}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Aladhan API failed");
  const json = await res.json();
  const t = json.data.timings;
  // store cache
  await db.prayerTimeCache
    .upsert({
      where: { date_lat_lng_method: { date, lat: meta.lat, lng: meta.lng, method } },
      create: {
        date,
        city: meta.name,
        lat: meta.lat,
        lng: meta.lng,
        method,
        times: t as any,
      },
      update: { times: t as any },
    })
    .catch(() => {});
  return {
    date,
    city: meta.name,
    lat: meta.lat,
    lng: meta.lng,
    Fajr: t.Fajr,
    Sunrise: t.Sunrise,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
}

/** Static fallback (Dhaka-ish offsets) if the API is unreachable. */
function fallbackTimes(meta: { name: string; lat: number; lng: number }, date: string): PrayerTimes {
  return {
    date,
    city: meta.name,
    lat: meta.lat,
    lng: meta.lng,
    Fajr: "05:00",
    Sunrise: "06:15",
    Dhuhr: "12:00",
    Asr: "16:00",
    Maghrib: "18:00",
    Isha: "19:30",
  };
}
