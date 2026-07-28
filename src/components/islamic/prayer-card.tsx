"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Moon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { usePrayerTimes, usePrayerRecord, useTogglePrayer } from "@/hooks/use-prayer";
import { getNextPrayer, nextPrayerSummary } from "@/lib/prayer";
import { bnTime, toBn, bnDuration } from "@/lib/date-bn";
import { PRAYERS, BD_CITIES } from "@/constants";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PrayerCard() {
  const [city, setCity] = useState("ঢাকা");
  const [now, setNow] = useState(new Date());

  const { data: times, isLoading } = usePrayerTimes(city);
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

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-islamic/10 via-card to-card p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-islamic/15 blur-3xl" />
      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-islamic text-islamic-foreground shadow-sm">
              <Moon size={18} />
            </div>
            <div>
              <h2 className="font-bold leading-tight">নামাজের সময়সূচি</h2>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11} />
                {city}
              </div>
            </div>
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-8 w-28 text-xs">
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

        {/* Next prayer highlight */}
        {next && (
          <div className="mb-4 flex items-center gap-4 rounded-2xl bg-islamic/10 p-3">
            <ProgressRing
              value={progressToNext(times!, now)}
              size={64}
              stroke={6}
              color="var(--islamic)"
              animate={false}
            >
              <span className="text-lg">{next.emoji}</span>
            </ProgressRing>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">
                {next.isTomorrow ? "আগামীকাল" : "পরবর্তী নামাজ"}
              </div>
              <div className="text-base font-bold">{next.label}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {bnTime(next.time).label} {bnTime(next.time).period} • {bnDuration(next.msUntil)} পর
              </div>
            </div>
            <div className="text-right">
              <div className="tabular text-2xl font-extrabold text-islamic">{toBn(doneCount)}</div>
              <div className="text-[10px] text-muted-foreground">/ ৫ সম্পন্ন</div>
            </div>
          </div>
        )}

        {/* Prayer list */}
        <div className="grid grid-cols-5 gap-2">
          {PRAYERS.map((p) => {
            const done = record?.[p.field] ?? false;
            const time = times ? times[p.field === "fajr" ? "Fajr" : p.field === "dhuhr" ? "Dhuhr" : p.field === "asr" ? "Asr" : p.field === "maghrib" ? "Maghrib" : "Isha"] : "--:--";
            const t = time !== "--:--" ? bnTime(time) : null;
            return (
              <motion.button
                key={p.key}
                whileTap={{ scale: 0.94 }}
                onClick={() => toggle.mutate({ date: new Date().toISOString().slice(0, 10), field: p.field })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-2 transition",
                  done
                    ? "border-islamic bg-islamic/10"
                    : "hover:border-islamic/40"
                )}
              >
                <span className="text-base">{p.emoji}</span>
                <span className="text-[10px] font-semibold">{p.label}</span>
                <span className="tabular text-[10px] text-muted-foreground">
                  {t ? `${t.label}` : "—"}
                </span>
                <span
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
            onClick={() => toggle.mutate({ date: new Date().toISOString().slice(0, 10), field: "sunnahFajr" })}
          />
          <ExtraToggle
            label="তাহাজ্জুদ"
            done={record?.tahajjud ?? false}
            onClick={() => toggle.mutate({ date: new Date().toISOString().slice(0, 10), field: "tahajjud" })}
          />
        </div>

        {isLoading && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            সময়সূচি লোড হচ্ছে...
          </div>
        )}
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
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-medium transition",
        done ? "border-islamic bg-islamic/10 text-islamic" : "text-muted-foreground hover:border-islamic/40"
      )}
    >
      {done ? "✓ " : ""}
      {label}
    </button>
  );
}

/** 0..1 progress between the previous prayer and the next. */
function progressToNext(times: any, now: Date): number {
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
