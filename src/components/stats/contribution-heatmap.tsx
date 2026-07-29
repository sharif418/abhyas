"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toBn, fromDateKey } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // number of habit completions on that day
}

type RangeKey = 30 | 90;
type Level = 0 | 1 | 2 | 3 | 4;

/** Bengali weekday labels for the X-axis (column headers).
 *  Index 0 = Sunday (রবি), matching Date#getDay(). */
const WEEKDAY_LABELS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

/** Bengali month short names for the Y-axis (row labels). */
const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

/** 5-level intensity palette using `bg-primary` opacity variants.
 *  Level 0 = empty/muted (neutral), 1 = light, 4 = darkest. */
const LEVEL_BG: Record<Level, string> = {
  0: "bg-muted",
  1: "bg-primary/10",
  2: "bg-primary/30",
  3: "bg-primary/50",
  4: "bg-primary",
};

/** Map a per-day count to an intensity level relative to the max. */
function getLevel(count: number, maxCount: number): Level {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface ContributionHeatmapProps {
  /** Daily completion series — pass `stats.yearlyHeatmap` (365 days) so the
   *  90-day toggle has data. The component slices to the selected range. */
  data: HeatmapDay[];
}

/**
 * GitHub-style contribution heatmap for the Stats page.
 *
 * Orientation (per spec):
 *   - X-axis: 7 weekday columns (রবি, সোম, মঙ্গল, বুধ, বৃহ, শুক্র, শনি)
 *   - Y-axis: rows of weeks going downward (oldest at top, newest at bottom)
 *             with Bengali month labels placed next to the row where the
 *             month first appears.
 *
 * Supports a 30-day and 90-day toggle. Uses 5 intensity levels based on
 * `bg-primary` opacity variants. Hovering a cell shows a Bengali tooltip
 * with the date and completion count. Cells animate in with a staggered
 * Framer Motion entrance.
 */
export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const [range, setRange] = useState<RangeKey>(30);

  // Slice to the selected range (last N days, inclusive of today).
  const sliced = useMemo(() => data.slice(-range), [data, range]);

  const maxCount = useMemo(
    () => Math.max(...sliced.map((d) => d.count), 1),
    [sliced]
  );

  const totalCompletions = useMemo(
    () => sliced.reduce((sum, d) => sum + d.count, 0),
    [sliced]
  );

  const bestDay = useMemo<HeatmapDay | null>(() => {
    return sliced.reduce<HeatmapDay | null>(
      (best, d) => (!best || d.count > best.count ? d : best),
      null
    );
  }, [sliced]);

  // Group days into 7-column rows aligned to weekday columns.
  // The first day may not be a Sunday, so we pad the start with null slots.
  const weeks = useMemo<(HeatmapDay | null)[][]>(() => {
    if (sliced.length === 0) return [];
    const first = fromDateKey(sliced[0].date);
    const leadPad = first.getDay(); // 0 = Sunday → column 0
    const cells: (HeatmapDay | null)[] = [
      ...Array<null>(leadPad).fill(null),
      ...sliced,
    ];
    const rows: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const row = cells.slice(i, i + 7);
      while (row.length < 7) row.push(null); // pad trailing row
      rows.push(row);
    }
    return rows;
  }, [sliced]);

  // Place a month label on the row where the month first appears.
  const monthLabels = useMemo<{ rowIdx: number; label: string }[]>(() => {
    const out: { rowIdx: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, ri) => {
      const firstReal = week.find((c): c is HeatmapDay => c !== null);
      if (!firstReal) return;
      const d = fromDateKey(firstReal.date);
      if (d.getMonth() !== lastMonth) {
        out.push({ rowIdx: ri, label: BN_MONTHS[d.getMonth()] });
        lastMonth = d.getMonth();
      }
    });
    return out;
  }, [weeks]);

  // "Today" = the most recent day in the data — highlight with a ring.
  const todayKey = sliced.length > 0 ? sliced[sliced.length - 1].date : null;

  // Empty state — no data at all.
  if (sliced.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <h2 className="mb-2 text-sm font-bold">কার্যকলাপ হিটম্যাপ</h2>
        <p className="py-6 text-center text-xs text-muted-foreground">
          কোনো কার্যকলাপ ডেটা নেই
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      {/* Header: title + range toggle */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">কার্যকলাপ হিটম্যাপ</h2>
          <p className="text-[11px] text-muted-foreground">
            গত {toBn(range)} দিনের অভ্যাস সম্পন্ন
          </p>
        </div>
        <div
          role="tablist"
          aria-label="সময়সীমা"
          className="flex shrink-0 gap-1 rounded-xl bg-muted/50 p-0.5"
        >
          {([30, 90] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition",
                range === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {toBn(r)} দিন
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats: total completions + best day */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-primary/5 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">মোট সম্পন্ন</div>
          <div className="tabular text-base font-bold text-primary">
            {toBn(totalCompletions)}টি
          </div>
        </div>
        <div className="rounded-xl bg-primary/5 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">সেরা দিন</div>
          <div className="tabular text-base font-bold text-primary">
            {toBn(bestDay?.count ?? 0)}টি
          </div>
        </div>
      </div>

      {/* Heatmap grid: month-label column (Y-axis) + weekday columns (X-axis) */}
      <div className="flex gap-2">
        {/* Y-axis: month labels column */}
        <div className="flex w-12 shrink-0 flex-col gap-[3px] pt-4 sm:w-14">
          {weeks.map((_, ri) => {
            const label =
              monthLabels.find((m) => m.rowIdx === ri)?.label ?? "";
            return (
              <div
                key={ri}
                className="flex h-4 items-end text-[9px] leading-none text-muted-foreground sm:h-5 sm:text-[10px]"
              >
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </div>

        {/* X-axis + cells */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          {/* X-axis: weekday labels */}
          <div className="mb-1 flex gap-[3px] sm:gap-[4px]">
            {WEEKDAY_LABELS.map((wd) => (
              <div
                key={wd}
                className="h-3 w-4 text-center text-[9px] leading-3 text-muted-foreground sm:w-5 sm:text-[10px] sm:leading-3"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex flex-col gap-[3px] sm:gap-[4px]">
            {weeks.map((week, ri) => (
              <div key={ri} className="flex gap-[3px] sm:gap-[4px]">
                {week.map((day, ci) => (
                  <DayCell
                    key={day?.date ?? `pad-${ri}-${ci}`}
                    day={day}
                    level={day ? getLevel(day.count, maxCount) : 0}
                    isToday={day?.date === todayKey}
                    delay={Math.min(0.05 + (ri * 7 + ci) * 0.004, 0.6)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground">
        <span>কম</span>
        <div className="flex gap-[3px]">
          {([0, 1, 2, 3, 4] as Level[]).map((lvl) => (
            <div
              key={lvl}
              className={cn(
                "h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5",
                LEVEL_BG[lvl]
              )}
            />
          ))}
        </div>
        <span>বেশি</span>
      </div>
    </motion.div>
  );
}

/** A single heatmap cell with hover tooltip + entrance animation. */
function DayCell({
  day,
  level,
  isToday,
  delay,
}: {
  day: HeatmapDay | null;
  level: Level;
  isToday: boolean;
  delay: number;
}) {
  // Empty (padded) slot — keep the grid alignment without rendering a cell.
  if (!day) {
    return <div className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />;
  }

  const dateObj = fromDateKey(day.date);
  const dateLabel = `${toBn(dateObj.getDate())} ${BN_MONTHS[dateObj.getMonth()]}`;
  const countLabel =
    day.count > 0 ? `${toBn(day.count)}টি সম্পন্ন` : "কোনো সম্পন্ন নেই";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "h-4 w-4 cursor-default rounded-sm transition-all hover:ring-1 hover:ring-ring/60 sm:h-5 sm:w-5",
              LEVEL_BG[level],
              isToday && "ring-1 ring-primary ring-offset-1 ring-offset-card"
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="px-2.5 py-1.5 text-[11px]">
          <div className="font-medium">{dateLabel}</div>
          <div className="opacity-90">{countLabel}</div>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
