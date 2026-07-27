"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { todayKey } from "@/lib/date-bn";

export interface MoodData {
  series: { date: string; mood: number | null; note: string | null }[];
  average: number;
  total: number;
  today: { mood: number; note: string | null } | null;
}

/** Fetch mood data for the last N days. */
export function useMood(days = 30) {
  return useQuery<MoodData>({
    queryKey: ["mood", days],
    queryFn: () => api.get<MoodData>(`/api/mood?days=${days}`),
    staleTime: 30_000,
  });
}

/** Set today's mood (+ optional note). */
export function useSetMood() {
  const qc = useQueryClient();
  const haptics = useSettingsStore((s) => s.haptics);

  return useMutation({
    mutationFn: ({ mood, note, date }: { mood: number; note?: string | null; date?: string }) =>
      api.post("/api/mood", { mood, note: note ?? null, date: date ?? todayKey() }),
    onSuccess: () => {
      if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(20);
      }
      qc.invalidateQueries({ queryKey: ["mood"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => {
      toast.error("মুড সংরক্ষণে সমস্যা");
    },
  });
}

/** Set a note on a habit completion. */
export function useSetHabitNote(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, note }: { date: string; note: string | null }) =>
      api.post(`/api/habits/${habitId}/notes`, { date, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habit-notes", habitId] });
      toast.success("নোট সংরক্ষিত হয়েছে");
    },
    onError: () => {
      toast.error("নোট সংরক্ষণে সমস্যা");
    },
  });
}

/** Fetch recent notes for a habit. */
export function useHabitNotes(habitId: string | null) {
  return useQuery({
    queryKey: ["habit-notes", habitId],
    queryFn: () =>
      api.get<{ notes: { id: string; date: string; note: string; completedAt: string }[] }>(
        `/api/habits/${habitId}/notes`
      ),
    enabled: !!habitId,
  });
}
