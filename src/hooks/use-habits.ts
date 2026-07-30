"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { computeBestStreak, computeCurrentStreak } from "@/lib/streaks";
import { xpForCompletion, gamificationState } from "@/lib/gamification";
import { todayKey, toDateKey } from "@/lib/date-bn";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import {
  playCompletionSound,
  playStreakSound,
  playLevelUpSound,
  playPerfectDaySound,
} from "@/lib/sounds";
import type { Habit, HabitWithMeta } from "@/types";

/** Fetch all habits (server-aggregated with completions). */
export function useHabits() {
  return useQuery<HabitWithMeta[]>({
    queryKey: ["habits"],
    queryFn: () => api.get<HabitWithMeta[]>("/api/habits"),
  });
}

export interface HabitInput {
  name: string;
  nameEn?: string;
  icon: string;
  category: Habit["category"];
  color: string;
  target: string;
  frequency: Habit["frequency"];
  frequencyDays: number[];
  timesPerWeek: number;
  timeOfDay: Habit["timeOfDay"];
  reminderTime?: string | null;
  isIslamic?: boolean;
}

export function useCreateHabit() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: HabitInput) => api.post<Habit>("/api/habits", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "নতুন অভ্যাস যোগ হয়েছে", description: "শুভেচ্ছা! 🎉" });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<HabitInput> }) =>
      api.put<Habit>(`/api/habits/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast({ title: "অভ্যাস আপডেট হয়েছে" });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/api/habits/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "অভ্যাস মুছে ফেলা হয়েছে" });
    },
  });
}

export interface ToggleResult {
  completed: boolean;
  streak: number;
  bestStreak: number;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newBadgeIds: string[];
}

/**
 * Toggle today's completion for a habit with optimistic UI.
 * On success, shows streak / level-up / badge feedback.
 */
export function useToggleHabit() {
  const qc = useQueryClient();
  const haptics = useSettingsStore((s) => s.haptics);

  return useMutation({
    mutationFn: ({
      habitId,
      date,
    }: {
      habitId: string;
      date?: string;
    }) => api.post<ToggleResult>(`/api/habits/${habitId}/toggle`, { date }),
    onMutate: async ({ habitId, date }) => {
      const key = date ?? todayKey();
      await qc.cancelQueries({ queryKey: ["habits"] });
      const prev = qc.getQueryData<HabitWithMeta[]>(["habits"]);
      qc.setQueryData<HabitWithMeta[]>(["habits"], (old) => {
        if (!old) return old;
        return old.map((h) => {
          if (h.id !== habitId) return h;
          const willComplete = !h.completedToday;
          const completedDates = new Set(h.completedDates);
          if (willComplete) completedDates.add(key);
          else completedDates.delete(key);
          const streak = computeCurrentStreak(h, completedDates, new Date(), h.frozenDate);
          const bestStreak = Math.max(h.bestStreak, streak);
          return {
            ...h,
            completedToday: willComplete,
            completedDates: Array.from(completedDates).sort(),
            streak,
            bestStreak,
            totalDone: willComplete ? h.totalDone + 1 : Math.max(0, h.totalDone - 1),
          };
        });
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["habits"], ctx.prev);
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    },
    onSuccess: (res, vars) => {
      if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(res.completed ? 25 : 15);
      }
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["me"] });

      // broadcast to social feed (if connected) via a custom DOM event
      if (res.completed && typeof window !== "undefined") {
        const habit = qc.getQueryData<HabitWithMeta[]>(["habits"])?.find(
          (h) => h.id === vars.habitId
        );
        window.dispatchEvent(
          new CustomEvent("abhyas-activity", {
            detail: {
              type: [7, 14, 30, 100, 365].includes(res.streak)
                ? "streak"
                : "completion",
              habitName: habit?.name,
              streak: res.streak,
            },
          })
        );
      }

      if (res.completed) {
        const soundEnabled = useSettingsStore.getState().sound;

        // Streak milestone feedback
        if ([7, 14, 30, 100, 365].includes(res.streak)) {
          toast.success(`${res.streak} দিনের স্ট্রিক!`, {
            description: "অসাধারণ চালিয়ে যান!",
          });
          fireConfetti({ count: 120, duration: 900 });
          if (soundEnabled) playStreakSound();
        } else if (res.leveledUp) {
          const g = gamificationState(res.totalXp);
          toast.success(`লেভেল আপ! এখন লেভেল ${g.level}`, {
            description: `+${res.xpAwarded} XP অর্জন`,
          });
          fireConfetti({ count: 100, duration: 800 });
          if (soundEnabled) playLevelUpSound();
        } else {
          toast.success(`+${res.xpAwarded} XP`, {
            description: `স্ট্রিক: ${res.streak} দিন`,
            action: {
              label: "পূর্বাবস্থা",
              onClick: () => {
                // Re-toggle the habit (undo the completion)
                api.post(`/api/habits/${vars.habitId}/toggle`).then(() => {
                  qc.invalidateQueries({ queryKey: ["habits"] });
                  qc.invalidateQueries({ queryKey: ["stats"] });
                  qc.invalidateQueries({ queryKey: ["me"] });
                });
              },
            },
          });
          if (soundEnabled) playCompletionSound();
        }
        if (res.newBadgeIds.length > 0) {
          toast.success("নতুন ব্যাজ আনলক!", {
            description: res.newBadgeIds.join(", "),
          });
          fireConfetti({ count: 90, duration: 700 });
          if (soundEnabled) playLevelUpSound();
        }

        // Perfect day: if this completion made ALL scheduled habits done,
        // check optimistic cache. Detect via the invalidated query result.
        checkPerfectDay(qc, soundEnabled);
      }
      // silence unused var
      void vars;
    },
  });
}

/** Derived selector: habits grouped by time-of-day, with today's progress. */
export function useTodayProgress(habits: HabitWithMeta[] | undefined) {
  if (!habits) return { done: 0, total: 0, pct: 0, byTime: {} };
  const today = new Date();
  const active = habits.filter((h) => h.active);
  const scheduledToday = active.filter((h) => {
    // respect frequency
    if (h.frequency === "নির্দিষ্ট দিন") {
      const days = h.frequencyDays ?? [];
      if (days.length && !days.includes(today.getDay())) return false;
    }
    return true;
  });
  const done = scheduledToday.filter((h) => h.completedToday).length;
  const total = scheduledToday.length;
  const pct = total === 0 ? 0 : done / total;

  const byTime: Record<string, HabitWithMeta[]> = {
    সকাল: [],
    দুপুর: [],
    বিকাল: [],
    রাত: [],
  };
  for (const h of scheduledToday) {
    (byTime[h.timeOfDay] ??= []).push(h);
  }
  return { done, total, pct, byTime };
}

export { computeBestStreak, computeCurrentStreak, todayKey, toDateKey };

/**
 * Detects a "perfect day" (all scheduled habits completed) right after a toggle
 * and fires a celebratory confetti burst + toast. Throttled to once per day via
 * localStorage so re-toggling doesn't re-fire.
 */
const PERFECT_DAY_KEY = "abhyas-perfect-day-fired";
function checkPerfectDay(
  qc: ReturnType<typeof useQueryClient>,
  soundEnabled?: boolean
) {
  const habits = qc.getQueryData<HabitWithMeta[]>(["habits"]);
  if (!habits) return;
  const today = new Date();
  const scheduled = habits.filter((h) => {
    if (!h.active) return false;
    if (h.frequency === "নির্দিষ্ট দিন") {
      const days = h.frequencyDays ?? [];
      if (days.length && !days.includes(today.getDay())) return false;
    }
    return true;
  });
  if (scheduled.length === 0) return;
  const allDone = scheduled.every((h) => h.completedToday);
  if (!allDone) return;

  const todayStr = todayKey();
  try {
    const fired = localStorage.getItem(PERFECT_DAY_KEY);
    if (fired === todayStr) return; // already celebrated today
    localStorage.setItem(PERFECT_DAY_KEY, todayStr);
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    toast.success("🎉 নিখুঁত দিন!", {
      description: "আজকের সব অভ্যাস সম্পন্ন! অসাধারণ!",
    });
    fireConfetti({ count: 160, duration: 1200 });
    if (soundEnabled) playPerfectDaySound();
  }, 250);
}

