"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { toBn, fromDateKey, addDays } from "@/lib/date-bn";
import { isScheduledOn } from "@/lib/streaks";
import type { Habit } from "@/types";

interface HeatmapProps {
  completedDates: string[]; // YYYY-MM-DD
  habit?: Habit | null; // for schedule awareness
  weeks?: number; // number of weeks to show (default ~26 = half year)
  color?: string;
  cellSize?: number;
  gap?: number;
  className?: string;
  showMonthLabels?: boolean;
  onCellClick?: (date: string) => void;
}

/**
 * GitHub-style contribution heatmap (Bengali localized).
 * Columns = weeks (oldest left → newest right), rows = weekdays.
 */
export function Heatmap({
  completedDates,
  habit = null,
  weeks = 26,
  color = "var(--primary)",
  cellSize = 13,
  gap = 3,
  className,
  showMonthLabels = true,
  onCellClick,
}: HeatmapProps) {
  const cells = useMemo(() => {
    const set = new Set(completedDates);
    const today = new Date();
    // align to start of the column (week starts Saturday for BD by default)
    const totalDays = weeks * 7;
    const start = addDays(today, -(totalDays - 1));
    // shift start back to the chosen week-start weekday
    const startWd = start.getDay();
    const weekStart = 6; // Saturday
    const back = (startWd - weekStart + 7) % 7;
    const realStart = addDays(start, -back);

    const out: { date: string; level: 0 | 1 | 2 | 3 | 4; scheduled: boolean }[] = [];
    for (let i = 0; i < totalDays + back; i++) {
      const d = addDays(realStart, i);
      if (d > today) break;
      const key = dateKey(d);
      const scheduled = habit ? isScheduledOn(habit, d) : true;
      const done = set.has(key);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (!scheduled) level = 0;
      else if (done) level = 4;
      else level = 1;
      out.push({ date: key, level, scheduled });
    }
    return out;
  }, [completedDates, habit, weeks]);

  // group into columns of 7 (one column per week)
  const columns: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  // month labels: place a label where the month changes
  const monthLabels: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((col, ci) => {
    if (col.length === 0) return;
    const d = fromDateKey(col[0].date);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ idx: ci, label: bnMonthShort(d) });
      lastMonth = d.getMonth();
    }
  });

  return (
    <div className={cn("fancy-scroll overflow-x-auto pb-1", className)}>
      <div className="inline-flex flex-col gap-1">
        {showMonthLabels && (
          <div className="flex gap-[3px] pl-0 text-[10px] text-muted-foreground">
            {columns.map((_, ci) => {
              const m = monthLabels.find((x) => x.idx === ci);
              return (
                <div
                  key={ci}
                  style={{ width: cellSize, marginRight: gap }}
                  className="h-3 whitespace-nowrap"
                >
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-[3px]">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, ri) => {
                const cell = col[ri];
                if (!cell) {
                  return (
                    <div
                      key={ri}
                      style={{ width: cellSize, height: cellSize, marginRight: gap }}
                    />
                  );
                }
                return (
                  <button
                    key={ri}
                    type="button"
                    onClick={() => onCellClick?.(cell.date)}
                    title={`${bnRel(cell.date)} — ${levelLabel(cell.level)}`}
                    style={{ width: cellSize, height: cellSize, marginRight: gap }}
                    className={cn(
                      "rounded-[3px] transition-all hover:ring-2 hover:ring-ring/50",
                      onCellClick && "cursor-pointer"
                    )}
                    data-level={cell.level}
                  >
                    <HeatmapCell level={cell.level} color={color} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapCell({ level, color }: { level: 0 | 1 | 2 | 3 | 4; color: string }) {
  const bg = useMemo(() => {
    if (level === 0) return "var(--muted)";
    if (level === 1) return colorMix(color, 0.12);
    if (level === 2) return colorMix(color, 0.35);
    if (level === 3) return colorMix(color, 0.65);
    return color;
  }, [level, color]);
  return (
    <div
      className="h-full w-full rounded-[3px]"
      style={{ background: bg, opacity: level === 0 ? 0.45 : 1 }}
    />
  );
}

function colorMix(color: string, alpha: number): string {
  if (color.startsWith("var(")) {
    // can't truly mix a CSS var here; use color-mix at runtime
    return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, var(--muted))`;
  }
  return color;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bnMonthShort(d: Date): string {
  const names = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
  return names[d.getMonth()];
}

function bnRel(key: string): string {
  const d = fromDateKey(key);
  const today = new Date();
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  );
  if (diff === 0) return "আজ";
  if (diff === 1) return "গতকাল";
  if (diff > 0 && diff < 7) return `${toBn(diff)} দিন আগে`;
  return `${toBn(d.getDate())} ${bnMonthShort(d)}`;
}

function levelLabel(level: number): string {
  return ["বন্ধ", "বাকি", "সম্পন্ন", "সম্পন্ন", "সম্পন্ন"][level] ?? "—";
}
