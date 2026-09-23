"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { api } from "@/lib/api-client";
import { useHabits } from "@/hooks/use-habits";
import { toBn } from "@/lib/date-bn";
import { FocusTimer } from "@/components/focus/focus-timer";
import { ScreenPinToggle } from "@/components/focus/focus-settings";
import { FocusHistory, type FocusData } from "@/components/focus/focus-history";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Focus view shell — header, the timer engine (own component), session stats
 * and the history panel (chart + list).
 */
export function FocusView() {
  const { data: habits } = useHabits();
  const {
    data: focusData,
    isLoading,
    isError: focusError,
  } = useQuery<FocusData>({
    queryKey: ["focus"],
    queryFn: () => api.get<FocusData>("/api/focus?days=7"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <header>
        <h1 className="text-xl font-bold">ফোকাস মোড</h1>
        <p className="text-xs text-muted-foreground">
          পোমোডোরো টেকনিকে দিয়ে গভীর কাজ করুন
        </p>
      </header>

      {/* Timer engine + work/break config + session config */}
      <FocusTimer habits={habits} />

      {/* ডিস্ট্রাকশন-ফ্রি ইবাদত: screen pin during focus (Android only) */}
      <ScreenPinToggle />

      {/* Today stats */}
      {isLoading ? (
        <Skeleton className="h-28 rounded-3xl" />
      ) : focusError ? (
        <div
          role="alert"
          className="rounded-2xl border border-dashed bg-card/50 p-4 text-center text-xs text-muted-foreground"
        >
          ফোকাস ডেটা লোড করা যায়নি।
        </div>
      ) : (
        focusData && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="আজ"
              value={focusData.todayMinutes}
              unit="মিনিট"
              tone="primary"
            />
            <StatBox
              label="এই সপ্তাহ"
              value={focusData.totalMinutes}
              unit="মিনিট"
              tone="streak"
            />
            <StatBox
              label="সেশন"
              value={focusData.totalSessions}
              unit="টি"
              tone="violet"
            />
            <StatBox
              label="স্ট্রিক"
              value={focusData.focusStreak}
              unit="দিন"
              tone="streak"
              icon="flame"
            />
          </div>
        )
      )}

      {/* History — daily chart + recent sessions */}
      {focusData && <FocusHistory data={focusData} habits={habits} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat box — token-driven value colors (no hardcoded hex)            */
/* ------------------------------------------------------------------ */

type StatTone = "primary" | "streak" | "violet";

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  primary: "text-primary",
  streak: "text-streak",
  violet: "text-violet-600 dark:text-violet-400",
};

function StatBox({
  label,
  value,
  unit,
  tone = "primary",
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: StatTone;
  icon?: "flame";
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center">
      <div
        className={cn(
          "flex items-center justify-center gap-1 tabular text-xl font-extrabold leading-none",
          STAT_TONE_CLASSES[tone]
        )}
      >
        {icon === "flame" && value > 0 && (
          <Flame size={14} fill="currentColor" className="streak-glow" />
        )}
        {toBn(value)}
      </div>
      <div className="text-[9px] text-muted-foreground">{unit}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
