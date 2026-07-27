"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { todayKey } from "@/lib/date-bn";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import type { PrayerRecord, PrayerTimes } from "@/types";

export function usePrayerTimes(city: string) {
  return useQuery<PrayerTimes>({
    queryKey: ["prayer-times", city],
    queryFn: () =>
      api.get<PrayerTimes>(`/api/prayer/times?city=${encodeURIComponent(city)}`),
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

export function usePrayerRecord(date?: string) {
  const day = date ?? todayKey();
  return useQuery<PrayerRecord | null>({
    queryKey: ["prayer-record", day],
    queryFn: () =>
      api.get<PrayerRecord | null>(`/api/prayer/log?date=${day}`),
  });
}

type PrayerField =
  | "fajr"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "sunnahFajr"
  | "sunnahOther"
  | "tahajjud";

export function useTogglePrayer() {
  const qc = useQueryClient();
  const haptics = useSettingsStore((s) => s.haptics);
  return useMutation({
    mutationFn: ({
      date,
      field,
    }: {
      date: string;
      field: PrayerField;
    }) =>
      api.post<PrayerRecord>("/api/prayer/log", { date, field }),
    onMutate: async ({ date, field }) => {
      await qc.cancelQueries({ queryKey: ["prayer-record", date] });
      const prev = qc.getQueryData<PrayerRecord | null>(["prayer-record", date]);
      qc.setQueryData<PrayerRecord | null>(["prayer-record", date], (old) => {
        if (!old) {
          return {
            id: "temp",
            date,
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false,
            sunnahFajr: false,
            sunnahOther: false,
            tahajjud: false,
            [field]: true,
          } as PrayerRecord;
        }
        return { ...old, [field]: !old[field] } as PrayerRecord;
      });
      return { prev };
    },
    onError: (_e, { date }, ctx) => {
      if (ctx?.prev !== undefined)
        qc.setQueryData(["prayer-record", date], ctx.prev);
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    },
    onSuccess: (_data, { field }) => {
      if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(20);
      }
      qc.invalidateQueries({ queryKey: ["stats"] });
      void field;
    },
  });
}

export function useQuranSessions() {
  return useQuery({
    queryKey: ["quran"],
    queryFn: () => api.get<{ sessions: any[]; totalPages: number; streak: number }>("/api/quran"),
  });
}

export function useLogQuran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      date: string;
      surah: number;
      fromAyah: number;
      toAyah: number;
      pagesRead: number;
      juz?: number;
    }) => api.post("/api/quran", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quran"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("কুরআন সেশন লগ হয়েছে 📖");
    },
  });
}
