"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Moon,
  Sunrise,
  Sun,
  Sunset,
  CloudSun,
  WifiOff,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { usePrayerTimes, usePrayerRecord, useTogglePrayer } from "@/hooks/use-prayer";
import { getPrayerCity, PRAYER_CITY_KEY } from "@/hooks/use-prayer-silence";
import { getNextPrayer } from "@/lib/prayer";
import { bnTime, toBn, bnDuration, todayKey } from "@/lib/date-bn";
import { PRAYERS, BD_CITIES } from "@/constants";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import type { PrayerTimes } from "@/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Lucide icon per prayer key (replaces the legacy emoji glyphs). */
const PRAYER_ICONS: Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", LucideIcon> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sunset,
  maghrib: CloudSun,
  isha: Moon,
};

/** PrayerMeta.field → PrayerTimes response key. */
const TIME_KEY = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
} as const;

export function PrayerCard() {
  const [city, setCity] = useState(getPrayerCity);
  const [now, setNow] = useState(new Date());

  // Remember the chosen city so other consumers (prayer-silence
  // suggestions) use the same location.
  useEffect(() => {
    try {
      localStorage.setItem(PRAYER_CITY_KEY, city);
    } catch {
      /* ignore */
    }
  }, [city]);

  const { data: times, isLoading, isError, refetch } = usePrayerTimes(city);
  const { data: record } = usePrayerRecord();
  const toggle = useTogglePrayer();

  // tick every 30s for countdown refresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const next = times ? getNextPrayer(times, now) : null;
  const doneCount = record
    ? [record.fajr, record.dhuhr, record.asr, record.maghrib, record.isha].filter(Boolean).length
    : 0;
  const today = todayKey();

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-islamic/10 via-card to-card p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-islamic/15 blur-3xl" aria-hidden />
      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-islamic text-islamic-foreground shadow-sm">
              <Moon size={18} aria-hidden />
            </div>
            <div>
              <h2 className="font-bold leading-tight">নামাজের সময়সূচি</h2>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11} aria-hidden />
                {city}
              </div>
            </div>
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-8 w-28 text-xs" aria-label="শহর নির্বাচন করুন">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BD_CITIES.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Next prayer highlight / loading skeleton / error */}
        {isLoading ? (
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-islamic/10 p-3" aria-hidden>
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-7 w-10" />
              <Skeleton className="ml-auto h-2.5 w-14" />
            </div>
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="mb-4 flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <WifiOff size={18} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">নামাজের সময় লোড করা যায়নি</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:outline-none active:scale-95"
            >
              <RefreshCw size={13} aria-hidden />
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : (
          next && (
            <div className="mb-4 flex items-center gap-4 rounded-2xl bg-islamic/10 p-3">
              <ProgressRing
                value={progressToNext(times!, now)}
                size={64}
                stroke={6}
                color="var(--islamic)"
                animate={false}
              >
                {(() => {
                  const NextIcon = PRAYER_ICONS[next.key];
                  return <NextIcon size={22} className="text-islamic" aria-hidden />;
                })()}
              </ProgressRing>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground">
                  {next.isTomorrow ? "আগামীকাল" : "পরবর্তী নামাজ"}
                </div>
                <div className="text-base font-bold">{next.label}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={11} aria-hidden />
                  {bnTime(next.time).label} {bnTime(next.time).period} • {bnDuration(next.msUntil)} পর
                </div>
              </div>
              <div className="text-right">
                <div className="tabular text-2xl font-extrabold text-islamic">{toBn(doneCount)}</div>
                <div className="text-[10px] text-muted-foreground">/ ৫ সম্পন্ন</div>
              </div>
            </div>
          )
        )}

        {/* Prayer list — toggles stay interactive while times load/fail */}
        <div className="grid grid-cols-5 gap-2">
          {PRAYERS.map((p) => {
            const done = record?.[p.field] ?? false;
            const time = times ? times[TIME_KEY[p.key]] : null;
            const t = time ? bnTime(time) : null;
            const Icon = PRAYER_ICONS[p.key];
            return (
              <motion.button
                key={p.key}
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-pressed={done}
                aria-label={`${p.label} ${done ? "সম্পন্ন হয়েছে" : "সম্পন্ন হয়নি"}`}
                onClick={() => toggle.mutate({ date: today, field: p.field })}
                className={cn(
                  "focus-visible:ring-ring flex flex-col items-center gap-1 rounded-2xl border p-2 transition focus-visible:ring-2 focus-visible:outline-none",
                  done
                    ? "border-islamic bg-islamic/10"
                    : "hover:border-islamic/40"
                )}
              >
                <Icon size={18} aria-hidden />
                <span className="text-[10px] font-semibold">{p.label}</span>
                <span className="tabular text-[10px] text-muted-foreground">
                  {isLoading ? (
                    <span
                      aria-hidden
                      className="bg-accent inline-block h-2.5 w-9 animate-pulse rounded-full align-middle"
                    />
                  ) : t ? (
                    t.label
                  ) : (
                    "—"
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                    done ? "bg-islamic text-islamic-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? "✓" : ""}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Sunnah extras */}
        <div className="mt-3 flex gap-2">
          <ExtraToggle
            label="সুন্নাত (ফজর)"
            done={record?.sunnahFajr ?? false}
            onClick={() => toggle.mutate({ date: today, field: "sunnahFajr" })}
          />
          <ExtraToggle
            label="তাহাজ্জুদ"
            done={record?.tahajjud ?? false}
            onClick={() => toggle.mutate({ date: today, field: "tahajjud" })}
          />
        </div>
      </div>
    </div>
  );
}

function ExtraToggle({
  label,
  done,
  onClick,
}: {
  label: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={`${label} ${done ? "সম্পন্ন হয়েছে" : "সম্পন্ন হয়নি"}`}
      className={cn(
        "focus-visible:ring-ring flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-medium transition focus-visible:ring-2 focus-visible:outline-none",
        done ? "border-islamic bg-islamic/10 text-islamic" : "text-muted-foreground hover:border-islamic/40"
      )}
    >
      <span aria-hidden>{done ? "✓ " : ""}</span>
      {label}
    </button>
  );
}

/** 0..1 progress between the previous prayer and the next. */
function progressToNext(times: PrayerTimes, now: Date): number {
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
  let prev: Date | null = null;
  let next: Date | null = null;
  for (const k of order) {
    const [h, m] = times[k].split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now.getTime()) prev = d;
    else {
      next = d;
      break;
    }
  }
  if (!prev || !next) return 0.1;
  const total = next.getTime() - prev.getTime();
  const elapsed = now.getTime() - prev.getTime();
  return Math.max(0.05, Math.min(0.97, elapsed / total));
}
