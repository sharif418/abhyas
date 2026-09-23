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
  toggleSmartReminders: () => void;
  togglePrayerSilence: () => void;
  togglePrayerAlarms: () => void;
  setPrayerAlarmOffset: (min: number) => void;
  togglePrayerAlarmPrayer: (key: string) => void;
  togglePrayerAutoSilence: () => void;
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
      toggleSmartReminders: () =>
        set((s) => ({ smartRemindersEnabled: !s.smartRemindersEnabled })),
      togglePrayerSilence: () =>
        set((s) => ({ prayerSilenceEnabled: !s.prayerSilenceEnabled })),
      togglePrayerAlarms: () =>
        set((s) => ({ prayerAlarmsEnabled: !s.prayerAlarmsEnabled })),
      setPrayerAlarmOffset: (min) => set({ prayerAlarmOffsetMin: min }),
      togglePrayerAlarmPrayer: (key) =>
        set((s) => {
          const all = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
          const current = s.prayerAlarmPrayers ?? all;
          const next = current.includes(key)
            ? current.filter((k) => k !== key)
            : [...current, key];
          // keep canonical order regardless of toggle sequence
          return { prayerAlarmPrayers: all.filter((k) => next.includes(k)) };
        }),
      togglePrayerAutoSilence: () =>
        set((s) => ({ prayerAutoSilenceEnabled: !s.prayerAutoSilenceEnabled })),
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
        smartRemindersEnabled: s.smartRemindersEnabled,
        prayerSilenceEnabled: s.prayerSilenceEnabled,
        prayerAlarmsEnabled: s.prayerAlarmsEnabled,
        prayerAlarmOffsetMin: s.prayerAlarmOffsetMin,
        prayerAlarmPrayers: s.prayerAlarmPrayers,
        prayerAutoSilenceEnabled: s.prayerAutoSilenceEnabled,
      }),
    }
  )
);
