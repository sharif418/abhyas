"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ArrowUpDown, Check, LayoutGrid, Flame, TrendingUp, Target, GripVertical } from "lucide-react";
import { useHabits, useToggleHabit } from "@/hooks/use-habits";
import { useUIStore } from "@/stores/ui-store";
import { HabitRow } from "@/components/habits/habit-row";
import { SortableHabitsList } from "@/components/habits/sortable-habits-list";
import { TemplatesModal } from "@/components/habits/templates-modal";
import { EmptyState } from "@/components/shared/stat-pill";
import { Input } from "@/components/ui/input";
import { CATEGORIES, TIMES_OF_DAY } from "@/constants";
import { cn } from "@/lib/utils";
import { toBn } from "@/lib/date-bn";
import { IconRenderer } from "@/components/shared/icon-renderer";
import type { HabitCategory } from "@/types";

type Filter = "all" | "active" | "done" | HabitCategory;

export function HabitsView() {
  const { data: habits, isLoading } = useHabits();
  const toggle = useToggleHabit();
  const openHabitDetail = useUIStore((s) => s.openHabitDetail);
  const openAddHabit = useUIStore((s) => s.openAddHabit);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [reorderMode, setReorderMode] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // reorder mode only valid when no filter/search applied
  const canReorder = filter === "all" && !query.trim() && habits && habits.length > 0;

  const filtered = useMemo(() => {
    if (!habits) return [];
    let out = habits;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.nameEn ?? "").toLowerCase().includes(q)
      );
    }
    if (filter === "active") out = out.filter((h) => !h.completedToday);
    else if (filter === "done") out = out.filter((h) => h.completedToday);
    else if (filter !== "all") out = out.filter((h) => h.category === filter);
    return out;
  }, [habits, query, filter]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const h of filtered) {
      (map[h.timeOfDay] ??= []).push(h);
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">সকল অভ্যাস</h1>
          <p className="text-xs text-muted-foreground">
            {habits ? `${toBn(habits.length)} টি অভ্যাস` : "লোড হচ্ছে..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canReorder && (
            <button
              onClick={() => setReorderMode((v) => !v)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium shadow-sm transition active:scale-95",
                reorderMode
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-foreground"
              )}
              aria-label="ক্রম পরিবর্তন"
            >
              {reorderMode ? <Check size={16} /> : <ArrowUpDown size={16} />}
              <span className="hidden sm:inline">{reorderMode ? "সম্পন্ন" : "সাজান"}</span>
            </button>
          )}
          <button
            onClick={() => setTemplatesOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground shadow-sm transition hover:scale-105 active:scale-95"
            aria-label="টেমপ্লেট লাইব্রেরি"
            title="টেমপ্লেট লাইব্রেরি"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={openAddHabit}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 active:scale-95"
            aria-label="নতুন অভ্যাস"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Quick stats summary */}
      {habits && habits.length > 0 && !reorderMode && (
        <>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border bg-card p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 tabular text-base font-bold text-streak">
              <Flame size={14} fill="currentColor" />
              {toBn(habits.filter(h => h.streak > 0).length)}
            </div>
            <div className="text-[9px] text-muted-foreground">সক্রিয় স্ট্রিক</div>
          </div>
          <div className="rounded-2xl border bg-card p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 tabular text-base font-bold text-primary">
              <TrendingUp size={14} />
              {toBn(habits.filter(h => h.completedToday).length)}
              <span className="text-[10px] text-muted-foreground">/{toBn(habits.length)}</span>
            </div>
            <div className="text-[9px] text-muted-foreground">আজ সম্পন্ন</div>
          </div>
          <div className="rounded-2xl border bg-card p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 tabular text-base font-bold" style={{ color: "#7c3aed" }}>
              <Target size={14} />
              {toBn(Math.max(...habits.map(h => h.bestStreak), 0))}
            </div>
            <div className="text-[9px] text-muted-foreground">সেরা স্ট্রিক</div>
          </div>
        </div>
        {/* Top streaks mini-leaderboard */}
        {habits.filter(h => h.streak > 0).length > 0 && (
          <div className="mb-4 rounded-2xl border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Flame size={12} className="text-streak" />
              শীর্ষ স্ট্রিক
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {habits
                .filter(h => h.streak > 0)
                .sort((a, b) => b.streak - a.streak)
                .slice(0, 5)
                .map((h, i) => (
                  <button
                    key={h.id}
                    onClick={() => openHabitDetail(h.id)}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5 transition hover:bg-muted/70"
                  >
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      i === 0 ? "bg-amber-400 text-amber-950" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-400 text-orange-950" : "bg-muted text-muted-foreground"
                    )}>
                      {toBn(i + 1)}
                    </span>
                    <span className="text-xs font-medium">{h.name}</span>
                    <span className="flex items-center gap-0.5 tabular text-xs font-bold text-streak">
                      <Flame size={10} fill="currentColor" />
                      {toBn(h.streak)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
        </>
      )}

      {reorderMode && (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <GripVertical size={16} className="inline align-text-bottom mr-1" /> অভ্যাস ধরে টেনে নিয়ে ক্রম পরিবর্তন করুন। প্রতিটি সময়ের (সকাল/দুপুর/বিকাল/রাত) ভেতরে আলাদাভাবে সাজান।
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="অভ্যাস খুঁজুন..."
          className="pl-9"
        />
      </div>

      {/* Filter chips */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          সব
        </Chip>
        <Chip active={filter === "active"} onClick={() => setFilter("active")}>
          বাকি
        </Chip>
        <Chip active={filter === "done"} onClick={() => setFilter("done")}>
          সম্পন্ন
        </Chip>
        <span className="mx-1 self-center text-muted-foreground/40">|</span>
        {CATEGORIES.map((c) => (
          <Chip key={c.name} active={filter === c.name} onClick={() => setFilter(c.name)}>
            <IconRenderer name={c.icon} size={14} className="mr-1 shrink-0" aria-hidden />
            {c.label}
          </Chip>
        ))}
      </div>

      {!isLoading && habits && habits.length === 0 && (
        <EmptyState
          icon="ListChecks"
          title="কোনো অভ্যাস নেই"
          description="প্রথম অভ্যাস যোগ করে আপনার যাত্রা শুরু করুন।"
          action={
            <button
              onClick={openAddHabit}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              + নতুন অভ্যাস
            </button>
          }
        />
      )}

      {!isLoading && filtered.length === 0 && habits && habits.length > 0 && (
        <EmptyState
          icon="Search"
          title="কিছু পাওয়া যায়নি"
          description="অন্য ফিল্টার বা সার্চ চেষ্টা করুন।"
        />
      )}

      {reorderMode && canReorder && habits ? (
        <SortableHabitsList habits={habits} />
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {TIMES_OF_DAY.map((tod) => {
              const list = grouped[tod.key] ?? [];
              if (list.length === 0) return null;
              return (
                <motion.section
                  key={tod.key}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="text-base">{tod.emoji}</span>
                    <h2 className="font-bold">{tod.label}</h2>
                    <span className="text-xs text-muted-foreground">
                      {toBn(list.length)} টি
                    </span>
                  </div>
                  <div className="space-y-2">
                    {list.map((h) => (
                      <HabitRow
                        key={h.id}
                        habit={h}
                        onToggle={() => toggle.mutate({ habitId: h.id })}
                        onOpen={() => openHabitDetail(h.id)}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <TemplatesModal open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </div>
  );
}

function Chip({
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
        "flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
