"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TASBIH_PRESETS } from "@/constants";

interface TasbihState {
  presetId: string;
  count: number;
  round: number; // completed cycles
  target: number;
  totalToday: number;
  setPreset: (id: string) => void;
  tap: () => void;
  reset: () => void;
  setTarget: (n: number) => void;
}

const initial = TASBIH_PRESETS[0];

export const useTasbihStore = create<TasbihState>()(
  persist(
    (set) => ({
      presetId: initial.id,
      count: 0,
      round: 0,
      target: initial.target,
      totalToday: 0,
      setPreset: (id) => {
        const p = TASBIH_PRESETS.find((x) => x.id === id) ?? initial;
        set({ presetId: p.id, target: p.target, count: 0, round: 0 });
      },
      tap: () =>
        set((s) => {
          const next = s.count + 1;
          if (next >= s.target) {
            return {
              count: 0,
              round: s.round + 1,
              totalToday: s.totalToday + s.target,
            };
          }
          return { count: next, totalToday: s.totalToday + 1 };
        }),
      reset: () => set({ count: 0, round: 0 }),
      setTarget: (n) => set({ target: Math.max(1, n), count: 0, round: 0 }),
    }),
    {
      name: "abhyas-tasbih",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        presetId: s.presetId,
        target: s.target,
        totalToday: s.totalToday,
      }),
    }
  )
);
