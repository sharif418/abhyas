"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_SETTINGS } from "@/constants/settings";
import type { UserSettings } from "@/types";

interface SettingsState extends UserSettings {
  setTheme: (t: UserSettings["theme"]) => void;
  setAccent: (hex: string) => void;
  setWeekStartsOn: (d: 0 | 6) => void;
  toggleHaptics: () => void;
  toggleSound: () => void;
  toggleReminders: () => void;
  toggleNotifications: () => void;
  hydrateFromServer: (s: Partial<UserSettings>) => void;
  reset: () => void;
}

/**
 * Persisted user settings (client cache). Mirrored to the server via API.
 * The accent color is applied to the DOM as a CSS variable by a subscriber.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      toggleHaptics: () => set((s) => ({ haptics: !s.haptics })),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      toggleReminders: () => set((s) => ({ remindersEnabled: !s.remindersEnabled })),
      toggleNotifications: () =>
        set((s) => ({ notificationsEnabled: !s.notificationsEnabled })),
      hydrateFromServer: (s) => set({ ...s }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: "abhyas-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        accent: s.accent,
        weekStartsOn: s.weekStartsOn,
        haptics: s.haptics,
        sound: s.sound,
        remindersEnabled: s.remindersEnabled,
        notificationsEnabled: s.notificationsEnabled,
      }),
    }
  )
);
