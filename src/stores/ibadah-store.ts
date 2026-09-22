"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings-store";
import {
  acquireWakeLock,
  releaseWakeLock,
  enterFullscreen,
  exitFullscreen,
  hapticPulse,
} from "@/lib/ibadah";

/**
 * ইবাদত মোড session state.
 *
 * A session is one immersive Quran/Zikr sitting:
 *  - `mode`    : what the user is doing (quran reading / dhikr counting)
 *  - `dhikrKey`: which dhikr is being counted (for dhikr mode)
 *  - `count`   : live tap count
 *  - `startedAt`: epoch ms, drives the elapsed timer
 *
 * Starting a session:
 *  1. Optionally enters fullscreen + acquires a screen wake lock (settings).
 *  2. Notifies the server (`POST /api/ibadah`) so our own push notifications
 *     are suppressed for the session window (see push-scheduler).
 * Stopping reverses everything and logs a FocusSession (type "ibadah").
 */

export interface Dhikr {
  key: string;
  arabic: string;
  bengali: string;
  meaning: string;
  defaultTarget: number;
}

export const DHIKR_PRESETS: Dhikr[] = [
  {
    key: "subhanallah",
    arabic: "سُبْحَانَ اللَّه",
    bengali: "সুবহানাল্লাহ",
    meaning: "আল্লাহ পবিত্র",
    defaultTarget: 33,
  },
  {
    key: "alhamdulillah",
    arabic: "الْحَمْدُ لِلَّه",
    bengali: "আলহামদুলিল্লাহ",
    meaning: "সব প্রশংসা আল্লাহর",
    defaultTarget: 33,
  },
  {
    key: "allahuakbar",
    arabic: "اللَّهُ أَكْبَر",
    bengali: "আল্লাহু আকবার",
    meaning: "আল্লাহ সর্বশ্রেষ্ঠ",
    defaultTarget: 34,
  },
  {
    key: "astaghfirullah",
    arabic: "أَسْتَغْفِرُ اللَّه",
    bengali: "আস্তাগফিরুল্লাহ",
    meaning: "আল্লাহর কাছে ক্ষমা চাই",
    defaultTarget: 100,
  },
];

type IbadahMode = "quran" | "dhikr";

interface IbadahState {
  active: boolean;
  mode: IbadahMode | null;
  dhikrKey: string;
  count: number;
  target: number;
  startedAt: number | null;
  /** Capabilities actually granted this session (for the honest status row). */
  fullscreenGranted: boolean;
  wakeLockGranted: boolean;
  start: (mode: IbadahMode, opts?: { dhikrKey?: string; target?: number }) => void;
  stop: () => Promise<void>;
  tap: () => void;
  resetCount: () => void;
  setDhikr: (key: string) => void;
  setTarget: (n: number) => void;
}

export const useIbadahStore = create<IbadahState>((set, get) => ({
  active: false,
  mode: null,
  dhikrKey: "subhanallah",
  count: 0,
  target: 33,
  startedAt: null,
  fullscreenGranted: false,
  wakeLockGranted: false,

  start: async (mode, opts) => {
    const settings = useSettingsStore.getState();
    const dhikr = DHIKR_PRESETS.find((d) => d.key === (opts?.dhikrKey ?? "subhanallah"));
    const target = opts?.target ?? dhikr?.defaultTarget ?? 33;

    set({
      active: true,
      mode,
      dhikrKey: opts?.dhikrKey ?? "subhanallah",
      count: 0,
      target,
      startedAt: Date.now(),
      fullscreenGranted: false,
      wakeLockGranted: false,
    });

    // Take over the screen — as much as the web platform allows.
    let fullscreenGranted = false;
    if (settings.ibadahFullscreen) {
      fullscreenGranted = await enterFullscreen();
    }
    let wakeLockGranted = false;
    if (settings.ibadahWakeLock) {
      wakeLockGranted = await acquireWakeLock();
    }
    set({ fullscreenGranted, wakeLockGranted });

    // Ask the server to suppress this user's push notifications for 2 hours
    // (the session "ends" earlier client-side, but a generous window means
    // no reminder leaks through if the user forgets to exit cleanly).
    api
      .post("/api/ibadah", { active: true, durationMin: 120 })
      .catch(() => {/* non-critical */});
  },

  stop: async () => {
    const { startedAt, mode } = get();
    releaseWakeLock();
    await exitFullscreen();
    api.post("/api/ibadah", { active: false }).catch(() => {/* non-critical */});

    // Log the session as a FocusSession so Stats can show ইবাদত time.
    if (startedAt) {
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      api
        .post("/api/focus", {
          durationMin: minutes,
          type: "ibadah",
          tag: mode === "quran" ? "কুরআন তিলাওয়াত" : "জিকির",
          completed: true,
        })
        .catch(() => {/* non-critical */});
    }

    set({
      active: false,
      mode: null,
      count: 0,
      startedAt: null,
      fullscreenGranted: false,
      wakeLockGranted: false,
    });
  },

  tap: () => {
    const { count, target } = get();
    const next = count + 1;
    if (useSettingsStore.getState().haptics) hapticPulse(18);
    // Gentle double-pulse at every completed target round.
    if (next % target === 0 && useSettingsStore.getState().haptics) hapticPulse(45);
    set({ count: next });
  },

  resetCount: () => set({ count: 0 }),

  setDhikr: (key) => {
    const dhikr = DHIKR_PRESETS.find((d) => d.key === key);
    set({ dhikrKey: key, count: 0, target: dhikr?.defaultTarget ?? 33 });
  },

  setTarget: (n) => set({ target: Math.max(1, n) }),
}));
