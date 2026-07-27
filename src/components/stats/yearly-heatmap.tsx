"use client";

import { motion } from "framer-motion";
import { toBn, fromDateKey } from "@/lib/date-bn";

interface HeatmapDay {
  date: string;
  count: number;
}

/**
 * GitHub-style 365-day yearly heatmap showing combined habit completion density.
 * Renders as a grid of weeks (columns) × 7 days (rows).
 */
export function YearlyHeatmap({ data }: { data: HeatmapDay[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // group into weeks (columns of 7 days)
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  // month labels: place a label where the month changes
  const monthLabels: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, ci) => {
    if (week.length === 0) return;
    const d = fromDateKey(week[0].date);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ idx: ci, label: bnMonthShort(d) });
      lastMonth = d.getMonth();
    }
  });

  const activeDays = data.filter((d) => d.count > 0).length;
  const totalCompletions = data.reduce((s, d) => s + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">বার্ষিক কার্যকলাপ</h2>
          <p className="text-[11px] text-muted-foreground">গত ৩৬৫ দিনের সম্পন্ন</p>
        </div>
        <div className="text-right">
          <div className="tabular text-lg font-bold text-primary">
            {toBn(activeDays)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            সক্রিয় দিন / {toBn(totalCompletions)} সম্পন্ন
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="fancy-scroll overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels */}
          <div className="flex gap-[2px] pl-0 text-[9px] text-muted-foreground">
            {weeks.map((_, ci) => {
              const m = monthLabels.find((x) => x.idx === ci);
              return (
                <div
                  key={ci}
                  style={{ width: 11, marginRight: 2 }}
                  className="h-3 whitespace-nowrap"
                >
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>

          {/* Heat cells */}
          <div className="flex gap-[2px]">
            {weeks.map((week, ci) => (
              <div key={ci} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, ri) => {
                  const day = week[ri];
                  if (!day) {
                    return (
                      <div
                        key={ri}
                        style={{ width: 11, height: 11, marginRight: 2 }}
                      />
                    );
                  }
                  const intensity = day.count > 0 ? day.count / maxCount : 0;
                  return (
                    <div
                      key={ri}
                      title={`${day.date}: ${toBn(day.count)} সম্পন্ন`}
                      style={{
                        width: 11,
                        height: 11,
                        marginRight: 2,
                        background:
                          day.count === 0
                            ? "var(--muted)"
                            : `color-mix(in srgb, var(--primary) ${Math.max(
                                20,
                                intensity * 100
                              )}%, var(--muted))`,
                        opacity: day.count === 0 ? 0.4 : 1,
                        borderRadius: 2,
                      }}
                      className="transition-colors hover:ring-1 hover:ring-ring/50"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground">
        <span>কম</span>
        <div className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                background:
                  level === 0
                    ? "var(--muted)"
                    : `color-mix(in srgb, var(--primary) ${Math.max(
                        20,
                        level * 100
                      )}%, var(--muted))`,
                opacity: level === 0 ? 0.4 : 1,
              }}
            />
          ))}
        </div>
        <span>বেশি</span>
      </div>
    </motion.div>
  );
}

function bnMonthShort(d: Date): string {
  const names = [
    "জানু",
    "ফেব্রু",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্ট",
    "অক্টো",
    "নভে",
    "ডিসে",
  ];
  return names[d.getMonth()];
}
