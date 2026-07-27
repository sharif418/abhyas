"use client";

import { create } from "zustand";
import type { ViewKey } from "@/types";

interface UIState {
  view: ViewKey;
  selectedHabitId: string | null;
  addHabitOpen: boolean;
  editingHabitId: string | null;
  setView: (v: ViewKey) => void;
  openAddHabit: () => void;
  openEditHabit: (id: string) => void;
  closeHabitForm: () => void;
  openHabitDetail: (id: string) => void;
  closeHabitDetail: () => void;
}

/**
 * Client-side view router. Because the whole app lives on a single `/` route,
 * navigation between Home/Habits/Stats/Islamic/Profile is state-driven.
 */
export const useUIStore = create<UIState>((set) => ({
  view: "home",
  selectedHabitId: null,
  addHabitOpen: false,
  editingHabitId: null,
  setView: (view) =>
    set({ view, selectedHabitId: null, addHabitOpen: false, editingHabitId: null }),
  openAddHabit: () => set({ addHabitOpen: true, editingHabitId: null }),
  openEditHabit: (id) => set({ addHabitOpen: true, editingHabitId: id }),
  closeHabitForm: () => set({ addHabitOpen: false, editingHabitId: null }),
  openHabitDetail: (id) => set({ selectedHabitId: id }),
  closeHabitDetail: () => set({ selectedHabitId: null }),
}));
