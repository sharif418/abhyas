"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, BookHeart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn, bnDayFirst, fromDateKey } from "@/lib/date-bn";
import { IconTile } from "@/components/shared/icon-renderer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface JournalHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  note: string | null;
}

interface JournalDay {
  date: string;
  mood: { mood: number; note: string | null } | null;
  completedHabits: JournalHabit[];
  totalScheduled: number;
}

interface JournalResponse {
  days: JournalDay[];
  total: number;
  today: string;
}

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];
const MOOD_LABEL = ["", "খুব খারাপ", "খারাপ", "মোটামুটি", "ভালো", "খুব ভালো"];
const MOOD_COLOR = ["", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#059669"];

export function JournalView() {
  const { data, isLoading } = useQuery<JournalResponse>({
    queryKey: ["journal"],
    queryFn: () => api.get<JournalResponse>("/api/journal?days=30"),
    staleTime: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<number | null>(null);

  const allDays = data?.days ?? [];

  // apply filters client-side
  const days = useMemo(() => {
    let filtered = allDays;
    if (moodFilter !== null) {
      filtered = filtered.filter((d) => d.mood?.mood === moodFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => {
        // match mood note
        if (d.mood?.note?.toLowerCase().includes(q)) return true;
        // match any habit name or note
        return d.completedHabits.some(
          (h) =>
            h.name.toLowerCase().includes(q) ||
            (h.note?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return filtered;
  }, [allDays, searchQuery, moodFilter]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">জার্নাল</h1>
        <p className="text-xs text-muted-foreground">
          আপনার অভ্যাস, মুড ও নোটের সময়রেখা
        </p>
      </div>

      {/* Search + mood filter */}
      {allDays.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অভ্যাস, নোট বা মুড খুঁজুন..."
              className="h-9 pl-9 pr-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="মুছুন"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip
              active={moodFilter === null}
              onClick={() => setMoodFilter(null)}
            >
              সব
            </FilterChip>
            {[5, 4, 3, 2, 1].map((m) => (
              <FilterChip
                key={m}
                active={moodFilter === m}
                onClick={() => setMoodFilter(moodFilter === m ? null : m)}
              >
                {MOOD_EMOJI[m]} {MOOD_LABEL[m]}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-10 text-center">
          <BookHeart size={36} className="text-muted-foreground" />
          <div>
            <h3 className="font-semibold">
              {searchQuery || moodFilter !== null
                ? "কিছু পাওয়া যায়নি"
                : "এখনো কোনো এন্ট্রি নেই"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || moodFilter !== null
                ? "অন্য ফিল্টার বা সার্চ চেষ্টা করুন।"
                : "অভ্যাস সম্পন্ন করুন, মুড লগ করুন, বা নোট যোগ করুন — সব এখানে একসাথে দেখা যাবে।"}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />

          <AnimatePresence mode="popLayout">
            {days.map((day, idx) => (
              <JournalDayCard key={day.date} day={day} isToday={day.date === data?.today} index={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function JournalDayCard({
  day,
  isToday,
  index,
}: {
  day: JournalDay;
  isToday: boolean;
  index: number;
}) {
  const date = fromDateKey(day.date);
  const completionPct =
    day.totalScheduled > 0 ? day.completedHabits.length / day.totalScheduled : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.04 }}
      className="relative mb-4 pl-12"
    >
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-[10px] top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background",
          isToday ? "bg-primary" : day.mood ? "bg-card" : "bg-muted"
        )}
        style={
          day.mood
            ? { background: MOOD_COLOR[day.mood.mood] }
            : undefined
        }
      >
        {day.mood && (
          <span className="text-[8px]">{MOOD_EMOJI[day.mood.mood]}</span>
        )}
      </div>

      <div
        className={cn(
          "rounded-3xl border bg-card p-4 shadow-sm",
          isToday && "ring-1 ring-primary"
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {isToday ? "আজ" : bnDayFirst(date)}
              </span>
              {isToday && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                  আজ
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {toBn(day.completedHabits.length)}/{toBn(day.totalScheduled)} সম্পন্ন
              {completionPct === 1 && " • নিখুঁত!"}
            </div>
          </div>
          {day.mood && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: `color-mix(in srgb, ${MOOD_COLOR[day.mood.mood]} 15%, transparent)`,
                color: MOOD_COLOR[day.mood.mood],
              }}
            >
              <span>{MOOD_EMOJI[day.mood.mood]}</span>
              <span>{MOOD_LABEL[day.mood.mood]}</span>
            </div>
          )}
        </div>

        {/* Mood note */}
        {day.mood?.note && (
          <div className="mb-2 rounded-xl bg-muted/40 p-2.5">
            <p className="text-xs italic leading-snug text-muted-foreground">
              {day.mood.note}
            </p>
          </div>
        )}

        {/* Completed habits */}
        {day.completedHabits.length > 0 ? (
          <div className="space-y-1.5">
            {day.completedHabits.map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-2.5 rounded-xl bg-background/50 p-2"
              >
                <IconTile name={h.icon} color={h.color} size={28} iconSize={14} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">{h.name}</div>
                  {h.note && (
                    <p className="mt-0.5 text-[11px] italic leading-snug text-muted-foreground">
                      {h.note}
                    </p>
                  )}
                </div>
                <span className="text-emerald-500">✓</span>
              </div>
            ))}
          </div>
        ) : (
          !day.mood && (
            <p className="text-center text-[11px] text-muted-foreground">
              কোনো কার্যকলাপ নেই
            </p>
          )
        )}
      </div>
    </motion.div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:border-foreground/20"
      )}
    >
      {children}
    </button>
  );
}
