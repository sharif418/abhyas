"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NativeAlarm, addAlarmActionListener } from "@/lib/native/alarm-plugin";
import { isNativeApp } from "@/lib/native/capacitor";
import { buildAlarmPlan } from "@/lib/notifications/alarm-plan";
import { usePrayerTimes } from "@/hooks/use-prayer";
import { useHabits } from "@/hooks/use-habits";
import { getPrayerCity } from "@/hooks/use-prayer-silence";
import { useSettingsStore } from "@/stores/settings-store";
import { BD_CITIES, PRAYERS } from "@/constants";
import { api } from "@/lib/api-client";
import type { PendingAction } from "@/lib/native/alarm-plugin";

/**
 * useNativeAlarms — the native alarm engine's web-side conductor.
 *
 * Mounted once in AppShell. Responsibilities:
 *
 *  1. SYNC — whenever the inputs change (settings, habits, prayer times,
 *     chosen city, day rollover, app resume), rebuild the alarm plan and
 *     hand it to the NativeAlarm plugin (diff-scheduled on the Android
 *     side; a no-op on the web platform).
 *
 *  2. DRAIN — notification action buttons ([✓ নামাজ হয়ে গেছে] / [✓ সম্পন্ন])
 *     work while the app is closed: the native side queues them and this
 *     hook applies them through the regular APIs on resume / periodically /
 *     via live events, then refreshes the UI. Failed applies are retried
 *     in-memory for the rest of the session.
 *
 * Everything is a no-op on the web platform — PWA users keep the existing
 * in-app + server Web Push stacks.
 */

/** Re-sync cadence while the app stays open (covers day rollover). */
const RESYNC_MS = 30 * 60 * 1000;
/** How often the pending-action queue is drained while the app is open. */
const DRAIN_MS = 60 * 1000;

export function useNativeAlarms() {
  const qc = useQueryClient();
  const { data: habits } = useHabits();

  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const prayerAlarmsEnabled = useSettingsStore((s) => s.prayerAlarmsEnabled);
  const prayerAlarmOffsetMin = useSettingsStore((s) => s.prayerAlarmOffsetMin);
  const prayerAlarmPrayers = useSettingsStore((s) => s.prayerAlarmPrayers);
  const prayerAutoSilenceEnabled = useSettingsStore((s) => s.prayerAutoSilenceEnabled);

  // The prayer city lives in localStorage (written by the prayer card).
  // We re-read it on mount, on the prayer-card event, and on app resume.
  const [city, setCity] = useState("ঢাকা");
  useEffect(() => {
    const read = () => setCity(getPrayerCity());
    read();
    const onCity = () => read();
    const onVisibility = () => {
      if (!document.hidden) read();
    };
    window.addEventListener("abhyas:prayer-city", onCity);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("abhyas:prayer-city", onCity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const isNative = isNativeApp() && prayerAlarmsEnabled;
  const { data: times } = usePrayerTimes(city, { enabled: isNative });

  // Actions that failed to apply and must be retried this session.
  const retryRef = useRef<PendingAction[]>([]);
  // Guards against concurrent drains (interval + visibility + live event).
  const drainingRef = useRef(false);

  // -------------------------------------------------------------------------
  // 1. Plan sync
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isNativeApp()) return;

    const sync = () => {
      const meta = BD_CITIES.find((c) => c.name === city) ?? BD_CITIES[0];
      const plan = buildAlarmPlan({
        settings: {
          notificationsEnabled,
          remindersEnabled,
          prayerAlarmsEnabled,
          prayerAlarmOffsetMin,
          prayerAlarmPrayers,
          prayerAutoSilenceEnabled,
        },
        habits: habits ?? [],
        prayerTimes: times,
        city: meta,
      });

      NativeAlarm.syncAlarms({
        alarms: plan.habitAlarms,
        prayerConfig: plan.prayerConfig,
      }).catch((err) => {
        console.warn("[native-alarms] sync failed:", err);
      });
    };

    // Debounced: many inputs change in bursts (settings + habits load).
    const id = setTimeout(sync, 800);

    const onVisibility = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(sync, RESYNC_MS);

    return () => {
      clearTimeout(id);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    city,
    notificationsEnabled,
    remindersEnabled,
    prayerAlarmsEnabled,
    prayerAlarmOffsetMin,
    prayerAlarmPrayers,
    prayerAutoSilenceEnabled,
    habits,
    times,
  ]);

  // -------------------------------------------------------------------------
  // 2. Pending-action drain (notification buttons pressed while closed)
  // -------------------------------------------------------------------------
  const applyAction = useCallback(
    async (action: PendingAction): Promise<boolean> => {
      try {
        if (action.type === "prayer-done" && action.prayerKey && action.date) {
          await api.post("/api/prayer/log", {
            date: action.date,
            field: action.prayerKey,
          });
          const meta = PRAYERS.find((p) => p.key === action.prayerKey);
          toast.success(`${meta?.label ?? "নামাজ"} নোটিফিকেশন থেকে চিহ্নিত হয়েছে`);
          return true;
        }
        if (action.type === "habit-done" && action.habitId) {
          await api.post(`/api/habits/${action.habitId}/toggle`, {
            date: action.date,
          });
          return true;
        }
        return true; // unknown shape — drop it rather than retry forever
      } catch {
        return false;
      }
    },
    []
  );

  const applyAndRefresh = useCallback(
    async (actions: PendingAction[]) => {
      if (actions.length === 0) return;
      let prayersTouched = false;
      let habitsTouched = false;

      for (const action of actions) {
        const ok = await applyAction(action);
        if (ok) {
          if (action.type === "prayer-done") prayersTouched = true;
          if (action.type === "habit-done") habitsTouched = true;
        } else {
          retryRef.current.push(action);
        }
      }

      if (prayersTouched) {
        void qc.invalidateQueries({ queryKey: ["prayer-record"] });
        void qc.invalidateQueries({ queryKey: ["stats"] });
      }
      if (habitsTouched) {
        void qc.invalidateQueries({ queryKey: ["habits"] });
        void qc.invalidateQueries({ queryKey: ["stats"] });
      }
    },
    [applyAction, qc]
  );

  const drain = useCallback(async () => {
    if (!isNativeApp()) return;
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      // Retry session leftovers first (they never went back to the queue).
      const retrying = retryRef.current;
      retryRef.current = [];
      await applyAndRefresh(retrying);

      const { actions } = await NativeAlarm.getPendingActions();
      await applyAndRefresh(actions);
    } catch (err) {
      console.warn("[native-alarms] drain failed:", err);
    } finally {
      drainingRef.current = false;
    }
  }, [applyAndRefresh]);

  useEffect(() => {
    if (!isNativeApp()) return;

    const initial = setTimeout(drain, 2500);
    const interval = setInterval(drain, DRAIN_MS);
    const onVisibility = () => {
      if (!document.hidden) void drain();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Live events: a notification button pressed while the app is foreground.
    const off = addAlarmActionListener((action) => {
      void applyAndRefresh([action]);
    });

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      off();
    };
  }, [drain, applyAndRefresh]);
}
