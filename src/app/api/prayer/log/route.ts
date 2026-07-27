import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { todayKey } from "@/lib/date-bn";
import type { PrayerRecord } from "@/types";

export const dynamic = "force-dynamic";

const FIELDS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "sunnahFajr",
  "sunnahOther",
  "tahajjud",
] as const;

/** GET /api/prayer/log?date=YYYY-MM-DD */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayKey();
  const rec = await db.prayerRecord.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  return NextResponse.json(rec ? serialize(rec) : null);
}

const Schema = z.object({
  date: z.string().default(todayKey()),
  field: z.enum(FIELDS),
});

/** POST /api/prayer/log — toggle a single prayer field for a date */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  const { date, field } = parsed.data;

  const existing = await db.prayerRecord.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  let rec;
  if (existing) {
    rec = await db.prayerRecord.update({
      where: { id: existing.id },
      data: { [field]: !existing[field] },
    });
  } else {
    // race-safe create: if a concurrent request created it first, fall back to update
    try {
      rec = await db.prayerRecord.create({
        data: { userId: user.id, date, [field]: true },
      });
    } catch {
      rec = await db.prayerRecord.update({
        where: { userId_date: { userId: user.id, date } },
        data: { [field]: true },
      });
    }
  }
  return NextResponse.json(serialize(rec));
}

function serialize(r: any): PrayerRecord {
  return {
    id: r.id,
    date: r.date,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: r.asr,
    maghrib: r.maghrib,
    isha: r.isha,
    sunnahFajr: r.sunnahFajr,
    sunnahOther: r.sunnahOther,
    tahajjud: r.tahajjud,
  };
}
