"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";

interface FreezeResult {
  ok: boolean;
  frozenDate: string | null;
  freezeUsedWeek: string | null;
  weekKey: string;
}

/** useFreezeHabit — apply a streak freeze to today for a habit. */
export function useFreezeHabit() {
  const qc = useQueryClient();
  const haptics = useSettingsStore((s) => s.haptics);

  return useMutation({
    mutationFn: (habitId: string) =>
      api.post<FreezeResult>(`/api/habits/${habitId}/freeze`),
    onSuccess: (res) => {
      if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([20, 40, 20]);
      }
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("❄️ স্ট্রিক ফ্রিজ ব্যবহৃত!", {
        description: "আজকের জন্য স্ট্রিক সুরক্ষিত রাখা হলো।",
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "ফ্রিজ করতে সমস্যা হয়েছে");
    },
  });
}

/** useReorderHabits — persist a new habit ordering. */
export function useReorderHabits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post<{ ok: boolean }>("/api/habits/reorder", { orderedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: () => {
      toast.error("ক্রম সংরক্ষণে সমস্যা");
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });
}
