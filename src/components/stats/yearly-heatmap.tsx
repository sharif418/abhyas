"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, fromDateKey, bnDayFirst } from "@/lib/date-bn";
import { X } from "lucide-react";
import { IconRenderer } from "@/components/shared/icon-renderer";

interface HeatmapDay {
  date: string;
  count: number;
}

/**
 * GitHub-style 365-day yearly heatmap showing combined habit completion density.
 * Renders as a grid of weeks (columns) × 7 days (rows).
 */
export function YearlyHeatmap({ data }: { data: HeatmapDay[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
                  const isSelected = selectedDate === day.date;
                  return (
                    <button
                      key={ri}
                      onClick={() => setSelectedDate(day.date)}
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
                        outline: isSelected ? "2px solid var(--primary)" : undefined,
                        outlineOffset: 1,
                      }}
                      className="cursor-pointer transition-all hover:ring-1 hover:ring-ring/50"
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

      {/* Day detail popover */}
      <AnimatePresence>
        {selectedDate && (
          <DayDetailPopover
            date={selectedDate}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];
const MOOD_LABEL = ["", "খুব খারাপ", "খারাপ", "মোটামুটি", "ভালো", "খুব ভালো"];

function DayDetailPopover({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["day", date],
    queryFn: () =>
      api.get<{
        date: string;
        completions: {
          habitId: string;
          name: string;
          icon: string;
          color: string;
          category: string;
          note: string | null;
        }[];
        mood: { mood: number; note: string | null } | null;
        focusMinutes: number;
        focusSessionCount: number;
      }>(`/api/day?date=${date}`),
    staleTime: 60_000,
  });

  const dayDate = fromDateKey(date);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border bg-card p-5 shadow-xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">{bnDayFirst(dayDate)}</h3>
            <p className="text-[11px] text-muted-foreground">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            {/* Mood */}
            {data.mood && (
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5">
                <span className="text-xl">{MOOD_EMOJI[data.mood.mood]}</span>
                <div>
                  <div className="text-xs font-semibold">
                    মুড: {MOOD_LABEL[data.mood.mood]}
                  </div>
                  {data.mood.note && (
                    <p className="text-[10px] italic text-muted-foreground">
                      {data.mood.note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Focus */}
            {data.focusMinutes > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-2.5">
                <span className="text-base">🎯</span>
                <div className="text-xs">
                  <span className="font-semibold">
                    {toBn(data.focusMinutes)} মিনিট ফোকাস
                  </span>
                  <span className="text-muted-foreground">
                    {" "}({toBn(data.focusSessionCount)} সেশন)
                  </span>
                </div>
              </div>
            )}

            {/* Completions */}
            {data.completions.length > 0 ? (
              <div>
                <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                  সম্পন্ন অভ্যাস ({toBn(data.completions.length)} টি)
                </div>
                <div className="space-y-1.5">
                  {data.completions.map((c) => (
                    <div
                      key={c.habitId}
                      className="flex items-start gap-2 rounded-xl bg-background/50 p-2"
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ background: c.color }}
                      >
                        <IconRenderer name={c.icon} size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold">{c.name}</div>
                        {c.note && (
                          <p className="text-[10px] italic text-muted-foreground">
                            {c.note}
                          </p>
                        )}
                      </div>
                      <span className="text-emerald-500">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !data.mood &&
              data.focusMinutes === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  এই দিনে কোনো কার্যকলাপ নেই
                </p>
              )
            )}
          </div>
        ) : null}
      </motion.div>
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
