"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Minus } from "lucide-react";
import { getBengaliWeekdayShort, toBn, fromDateKey } from "@/lib/date-bn";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsageGuard } from "@/hooks/use-guard";
import type { ScreenTimeState } from "@/hooks/use-screen-time";
import { GuardSection, WebFallback, formatMinutesBn } from "./guard-shared";
import { cn } from "@/lib/utils";

/**
 * ScreenTimeSection — the স্ক্রিন-টাইম রিপোর্ট: a 7-day usage bar chart,
 * week-over-week delta, this week's top apps, and per-budget health —
 * the "এই সপ্তাহে কতটা বাঁচালেন" celebration when usage drops.
 *
 * Data: getUsageRange(14) — the last 7 days are the current week, the 7
 * before that the honest baseline. Everything device-local.
 */
export function ScreenTimeSection({ screenTime }: { screenTime: ScreenTimeState }) {
  const guard = useUsageGuard();

  if (!screenTime.native) {
    return (
      <GuardSection title="স্ক্রিন-টাইম রিপোর্ট" icon={BarChart3} id="screen-time">
        <WebFallback featureName="স্ক্রিন-টাইম রিপোর্ট" />
      </GuardSection>
    );
  }

  if (screenTime.loading) {
    return (
      <GuardSection title="স্ক্রিন-টাইম রিপোর্ট" icon={BarChart3}>
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </GuardSection>
    );
  }

  const days = screenTime.range.days;
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const today = last7[last7.length - 1];
  const yesterday = last7[last7.length - 2];

  const weekTotal = last7.reduce((sum, d) => sum + d.totalMinutes, 0);
  const prevTotal = prev7.reduce((sum, d) => sum + d.totalMinutes, 0);
  const wowDelta = weekTotal - prevTotal;

  const todayTotal = today?.totalMinutes ?? 0;
  const yesterdayTotal = yesterday?.totalMinutes ?? 0;
  const dayDelta = todayTotal - yesterdayTotal;

  return (
    <GuardSection
      title="স্ক্রিন-টাইম রিপোর্ট"
      desc="দিনে কতক্ষণ ফোনে ছিলেন — সপ্তাহের ছবি এক নজরে"
      icon={BarChart3}
      id="screen-time"
    >
      {/* Today hero */}
      <div className="flex items-center gap-3 border-b px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-muted-foreground">আজ মোট</div>
          <div className="text-2xl font-bold tabular-nums">
            {formatMinutesBn(todayTotal)}
          </div>
        </div>
        {yesterday && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums",
              dayDelta > 0
                ? "bg-destructive/10 text-destructive"
                : dayDelta < 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {dayDelta > 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : dayDelta < 0 ? (
              <ArrowDownRight className="size-3.5" aria-hidden />
            ) : (
              <Minus className="size-3.5" aria-hidden />
            )}
            {dayDelta === 0
              ? "গতকালের মতোই"
              : dayDelta > 0
                ? `গতকালের চেয়ে ${formatMinutesBn(dayDelta)} বেশি`
                : `গতকালের চেয়ে ${formatMinutesBn(-dayDelta)} কম`}
          </div>
        )}
      </div>

      {/* Week-over-week celebration / honest callout */}
      {prev7.length > 0 && (
        <div
          className={cn(
            "mx-4 mt-3 rounded-xl p-3 text-xs leading-relaxed",
            wowDelta < 0
              ? "border border-primary/25 bg-primary/5"
              : "bg-muted/60 text-muted-foreground"
          )}
        >
          {wowDelta < 0 ? (
            <span className="font-semibold text-primary">
              এই সপ্তাহে গত সপ্তাহের চেয়ে {formatMinutesBn(-wowDelta)} কম স্ক্রিনে ছিলেন 🎉
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                সময়টা অভ্যাস আর ইবাদতে ফিরে আসুক — এভাবেই এগিয়ে যান।
              </span>
            </span>
          ) : wowDelta > 0 ? (
            <span>
              এই সপ্তাহে গত সপ্তাহের চেয়ে {formatMinutesBn(wowDelta)} বেশি স্ক্রিনে ছিলেন —
              নিচের অ্যাপগুলোতে সময়সীমা দিলে থামানোর স্ক্রিন সাহায্য করবে।
            </span>
          ) : (
            <span>গত সপ্তাহের সাথে একই রকম স্ক্রিন-টাইম — একটু কমানোর চেষ্টা করা যাক।</span>
          )}
        </div>
      )}

      {/* 7-day bars */}
      <div className="px-4 pb-1 pt-4">
        <div className="text-[11px] font-semibold text-muted-foreground">শেষ ৭ দিন</div>
        <div className="mt-2 flex h-28 items-end gap-1.5" role="img" aria-label="শেষ ৭ দিনের স্ক্রিন-টাইম">
          {last7.map((d, i) => (
            <WeekBar
              key={d.date}
              day={d}
              max={Math.max(30, ...last7.map((x) => x.totalMinutes))}
              isToday={i === last7.length - 1}
            />
          ))}
          {last7.length === 0 && (
            <p className="w-full py-4 text-center text-xs text-muted-foreground">
              দৈনিক ব্যবহারের তথ্য পাওয়া যায়নি — অ্যাপ কিছুদিন ব্যবহার করলে এখানে দেখা শুরু হবে।
            </p>
          )}
        </div>
      </div>

      {/* Top apps this week */}
      <TopApps last7={last7} />

      {/* Budget health */}
      <BudgetHealth
        last7={last7}
        limits={Object.fromEntries(
          guard.apps.filter((a) => a.limitMinutes > 0).map((a) => [a.packageName, a.limitMinutes])
        )}
      />

      {/* Interception celebration strip */}
      {guard.interception.enabled && guard.interception.blockedToday > 0 && (
        <div className="mx-4 mb-4 mt-1 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary">
          আজ {toBn(guard.interception.blockedToday)} বার থামানোর স্ক্রিন ফোন ঘুরিয়ে দিয়েছে —
          এগুলোর প্রতিটি ছিল আপনার সময় ফেরানোর সুযোগ।
        </div>
      )}
    </GuardSection>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function WeekBar({
  day,
  max,
  isToday,
}: {
  day: { date: string; totalMinutes: number };
  max: number;
  isToday: boolean;
}) {
  const pct = Math.max(day.totalMinutes > 0 ? 6 : 2, Math.round((day.totalMinutes / max) * 100));
  const weekday = getBengaliWeekdayShort(fromDateKey(day.date));
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-full w-full max-w-10 items-end justify-center rounded-md",
          isToday ? "bg-primary/15" : "bg-muted/50"
        )}
      >
        <div
          className={cn("w-full rounded-md", isToday ? "bg-primary" : "bg-primary/45")}
          style={{ height: `${pct}%` }}
          title={`${day.date}: ${formatMinutesBn(day.totalMinutes)}`}
        />
      </div>
      <span
        className={cn(
          "truncate text-[9px]",
          isToday ? "font-bold text-primary" : "text-muted-foreground"
        )}
      >
        {weekday}
      </span>
    </div>
  );
}

function TopApps({
  last7,
}: {
  last7: { date: string; totalMinutes: number; apps: { packageName: string; label: string; minutes: number }[] }[];
}) {
  const top = useMemo(() => {
    const totals = new Map<string, { label: string; minutes: number }>();
    for (const day of last7) {
      for (const app of day.apps) {
        const cur = totals.get(app.packageName);
        if (cur) cur.minutes += app.minutes;
        else totals.set(app.packageName, { label: app.label, minutes: app.minutes });
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 5);
  }, [last7]);

  if (top.length === 0) return null;
  const maxMinutes = Math.max(...top.map(([, v]) => v.minutes), 1);

  return (
    <div className="border-t px-4 py-3">
      <div className="text-[11px] font-semibold text-muted-foreground">এই সপ্তাহের সেরা ৫ অ্যাপ</div>
      <ul className="mt-2 space-y-2.5">
        {top.map(([pkg, v]) => (
          <li key={pkg} className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
              {v.label.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{v.label}</span>
                <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                  {formatMinutesBn(v.minutes)}
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${Math.max(4, Math.round((v.minutes / maxMinutes) * 100))}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetHealth({
  last7,
  limits,
}: {
  last7: {
    date: string;
    totalMinutes: number;
    apps: { packageName: string; label: string; minutes: number }[];
  }[];
  limits: Record<string, number>;
}) {
  const rows = useMemo(() => {
    const limited = Object.keys(limits);
    if (limited.length === 0) return [];
    return limited
      .map((pkg) => {
        let within = 0;
        let seen = 0;
        for (const day of last7) {
          const used = day.apps.find((a) => a.packageName === pkg)?.minutes ?? 0;
          if (used > 0) {
            seen++;
            if (used < limits[pkg]) within++;
          }
        }
        const label =
          last7.flatMap((d) => d.apps).find((a) => a.packageName === pkg)?.label ?? pkg;
        return { pkg, label, within, seen };
      })
      .filter((r) => r.seen > 0);
  }, [last7, limits]);

  if (rows.length === 0) return null;

  return (
    <div className="border-t px-4 py-3">
      <div className="text-[11px] font-semibold text-muted-foreground">সীমার ভেতরে ছিলেন</div>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.pkg} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{r.label}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums font-bold",
                r.within === r.seen ? "text-primary" : "text-amber-600"
              )}
            >
              {toBn(r.within)}/{toBn(r.seen)} দিন
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
