"use client";

/**
 * use-screen-time — the data layer for the স্ক্রিন-টাইম রিপোর্ট and
 * রাতের বিশ্রাম sections of the নিয়ন্ত্রণ কেন্দ্র।
 *
 *  • useScreenTime()  — 14-day per-app usage range (7 shown as the week,
 *    the previous 7 as the comparison baseline) + interception stats.
 *  • useBedtime()     — the native bedtime config (wind-down DND + morning
 *    sleep report), persisted in the alarm engine's store (boot-safe).
 *
 * Web/PWA: honest empty states (these are OS-level measurements a browser
 * cannot make) — the components render the install CTA instead.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native/capacitor";
import { NativeAlarm, type BedtimeConfig, type BedtimeConfigResult } from "@/lib/native/alarm-plugin";
import {
  UsageGuard,
  isUsageAccessError,
  type SleepEstimateResult,
  type UsageRangeResult,
} from "@/lib/native/usage-plugin";

const EMPTY_RANGE: UsageRangeResult = { days: [] };
const EMPTY_SLEEP: SleepEstimateResult = { lastNight: null, history: [] };

export interface ScreenTimeState {
  /** True inside the Android shell (web renders the honest fallback). */
  native: boolean;
  loading: boolean;
  /** 14 days (oldest → newest); the LAST 7 are the current week. */
  range: UsageRangeResult;
  /** Last night's estimate + recorded 7-night history. */
  sleep: SleepEstimateResult;
  /** Overlays shown today (from the interceptor). */
  blockedToday: number;
}

export function useScreenTime() {
  const native = isNativeApp();
  const [state, setState] = useState<ScreenTimeState>({
    native,
    loading: native,
    range: EMPTY_RANGE,
    sleep: EMPTY_SLEEP,
    blockedToday: 0,
  });

  const refresh = useCallback(async () => {
    // Web: the initial state is already the honest empty state — no-op keeps
    // every setState behind an await (no synchronous cascade from effects).
    if (!isNativeApp()) return;
    try {
      const access = await UsageGuard.isAccessGranted();
      if (!access.granted) {
        setState({ native: true, loading: false, range: EMPTY_RANGE, sleep: EMPTY_SLEEP, blockedToday: 0 });
        return;
      }
      const range = await UsageGuard.getUsageRange({ days: 14 });
      let sleep = EMPTY_SLEEP;
      try {
        sleep = await UsageGuard.getSleepEstimate();
      } catch {
        // Older native build — honest empty sleep card.
      }
      let blockedToday = 0;
      try {
        blockedToday = (await UsageGuard.getInterceptionStatus()).blockedToday;
      } catch {
        // interceptor not present in older builds
      }
      setState({ native: true, loading: false, range, sleep, blockedToday });
    } catch (err) {
      if (isUsageAccessError(err)) {
        setState({ native: true, loading: false, range: EMPTY_RANGE, sleep: EMPTY_SLEEP, blockedToday: 0 });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    // Initial load deferred a tick (external-scheduler callback — the
    // codebase pattern that keeps setState out of the effect body).
    const initial = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { ...state, native, refresh };
}

// ── Bedtime (রাতের বিশ্রাম) ─────────────────────────────────────────────────

const DEFAULT_BEDTIME: BedtimeConfig = {
  enabled: false,
  startMinutes: 23 * 60,
  endMinutes: 6 * 60,
  dnd: true,
};

export function useBedtime() {
  const native = isNativeApp();
  const [config, setConfig] = useState<BedtimeConfig>(DEFAULT_BEDTIME);
  const [loading, setLoading] = useState(native);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    NativeAlarm.getBedtimeConfig()
      .then((res: BedtimeConfigResult) => {
        if (!cancelled) {
          setConfig({
            enabled: res.enabled,
            startMinutes: res.startMinutes,
            endMinutes: res.endMinutes,
            dnd: res.dnd,
          });
        }
      })
      .catch(() => {
        /* defaults are honest for older builds */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: BedtimeConfig) => {
    setSaving(true);
    try {
      const res = await NativeAlarm.saveBedtimeConfig(next);
      setConfig({
        enabled: res.enabled,
        startMinutes: res.startMinutes,
        endMinutes: res.endMinutes,
        dnd: res.dnd,
      });
      toast.success(
        res.enabled
          ? `রাতের বিশ্রাম চালু — প্রতি রাতে মনে করিয়ে দেওয়া হবে`
          : "রাতের বিশ্রাম বন্ধ করা হয়েছে"
      );
      return true;
    } catch {
      toast.error("রাতের সেটিং সেভ করা যায়নি");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { native, config, loading, saving, save };
}
