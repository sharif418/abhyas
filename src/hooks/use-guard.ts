"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  UsageGuard,
  isUsageAccessError,
  type AppUsage,
  type InterceptionStatus,
  type UsageResult,
} from "@/lib/native/usage-plugin";
import {
  ContentGuard,
  isVpnPermissionError,
  type ContentGuardStatus,
  type ContentFilterMode,
} from "@/lib/native/content-plugin";

/**
 * React glue for the নিয়ন্ত্রণ কেন্দ্র (Control Center):
 *  - app time budgets (UsageGuard)
 *  - DNS content filter (ContentGuard)
 *
 * On the web every call is a no-op fallback; `native` stays false and the UI
 * renders the honest "অ্যান্ড্রয়েড অ্যাপ লাগবে" state with the install CTA.
 */

// ── App time limits (UsageGuard) ───────────────────────────────────────────

export interface UsageGuardState {
  loading: boolean;
  accessGranted: boolean;
  apps: AppUsage[];
  enforcementActive: boolean;
  /** Block-screen interceptor state (native only; defaults off on web). */
  interception: InterceptionStatus;
}

const INTERCEPTION_OFF: InterceptionStatus = {
  enabled: false,
  overlayGranted: false,
  serviceRunning: false,
  blockedToday: 0,
};

export function useUsageGuard() {
  const native = isNativeApp();
  const [state, setState] = useState<UsageGuardState>({
    loading: native, // only loads natively; web is instantly "empty"
    accessGranted: false,
    apps: [],
    enforcementActive: false,
    interception: INTERCEPTION_OFF,
  });
  const [busyPackage, setBusyPackage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isNativeApp()) {
      setState({
        loading: false,
        accessGranted: false,
        apps: [],
        enforcementActive: false,
        interception: INTERCEPTION_OFF,
      });
      return;
    }
    try {
      const access = await UsageGuard.isAccessGranted();
      if (!access.granted) {
        setState({
          loading: false,
          accessGranted: false,
          apps: [],
          enforcementActive: false,
          interception: INTERCEPTION_OFF,
        });
        return;
      }
      const usage: UsageResult = await UsageGuard.getUsageToday();
      let interception = INTERCEPTION_OFF;
      try {
        interception = await UsageGuard.getInterceptionStatus();
      } catch {
        // Older native build without the interceptor — honest defaults.
      }
      setState({
        loading: false,
        accessGranted: true,
        apps: usage.apps,
        enforcementActive: usage.enforcementActive,
        interception,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Re-check when returning to the app (usage keeps accruing outside).
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const requestAccess = useCallback(async () => {
    try {
      const res = await UsageGuard.requestAccess();
      if (res.opened) {
        toast.info("সেটিংসে “Usage access” অনুমতি দিন", {
          description: "ফিরে এলে নিয়ন্ত্রণ নিজেই চালু হবে।",
        });
      }
      return res;
    } catch {
      toast.error("সেটিংস খোলা যায়নি");
      return { granted: false, opened: false };
    }
  }, []);

  const setLimit = useCallback(
    async (packageName: string, minutesPerDay: number) => {
      setBusyPackage(packageName);
      try {
        if (minutesPerDay > 0) {
          await UsageGuard.setLimit({ packageName, minutesPerDay });
        } else {
          await UsageGuard.removeLimit({ packageName });
        }
        await refresh();
        toast.success(minutesPerDay > 0 ? "দৈনিক সময়সীমা সেভ হয়েছে" : "সময়সীমা তুলে দেওয়া হয়েছে");
      } catch (err) {
        if (isUsageAccessError(err)) {
          toast.error("আগে Usage access অনুমতি দিন");
        } else {
          toast.error("সময়সীমা সেভ করা যায়নি");
        }
      } finally {
        setBusyPackage(null);
      }
    },
    [refresh]
  );

  const setEnforcement = useCallback(
    async (enabled: boolean) => {
      try {
        const res = await UsageGuard.setEnforcement({ enabled });
        setState((s) => ({ ...s, enforcementActive: res.active }));
        toast.success(
          enabled ? "নজরদারি চালু — সময় পার হলে জানানো হবে" : "নজরদারি বন্ধ করা হয়েছে"
        );
      } catch (err) {
        if (isUsageAccessError(err)) {
          toast.error("আগে Usage access অনুমতি দিন");
        } else {
          toast.error(enabled ? "নজরদারি চালু করা যায়নি" : "নজরদারি বন্ধ করা যায়নি");
        }
      }
    },
    []
  );

  /** Arm/disarm the block screen (needs Usage access; implies the service). */
  const setInterception = useCallback(
    async (enabled: boolean) => {
      try {
        const res = await UsageGuard.setInterception({ enabled });
        setState((s) => ({ ...s, interception: { ...s.interception, enabled: res.enabled } }));
        toast.success(
          enabled
            ? "থামানোর স্ক্রিন চালু — সময় শেষ হলে অ্যাপ খুললেই মনে করিয়ে দেওয়া হবে"
            : "থামানোর স্ক্রিন বন্ধ করা হয়েছে"
        );
      } catch (err) {
        if (isUsageAccessError(err)) {
          toast.error("আগে Usage access অনুমতি দিন");
        } else {
          toast.error(enabled ? "থামানোর স্ক্রিন চালু করা যায়নি" : "বন্ধ করা যায়নি");
        }
      }
    },
    []
  );

  /** Opens the system "Display over other apps" screen (one-time). */
  const requestOverlayPermission = useCallback(async () => {
    try {
      const res = await UsageGuard.requestOverlayPermission();
      if (res.opened) {
        toast.info("সেটিংসে “Display over other apps” অনুমতি দিন", {
          description: "তালিকায় “অভ্যাস” খুঁজে অনুমতি দিন, তারপর অ্যাপে ফিরে আসুন।",
        });
      }
      return res;
    } catch {
      toast.error("সেটিংস খোলা যায়নি");
      return { granted: false, opened: false };
    }
  }, []);

  return {
    ...state,
    native,
    busyPackage,
    refresh,
    requestAccess,
    setLimit,
    setEnforcement,
    setInterception,
    requestOverlayPermission,
  };
}

// ── Content filter (ContentGuard) ──────────────────────────────────────────

export interface ContentGuardState {
  loading: boolean;
  status: ContentGuardStatus;
}

const EMPTY_STATUS: ContentGuardStatus = {
  running: false,
  mode: null,
  blockedToday: 0,
  totalToday: 0,
};

export function useContentGuard() {
  const native = isNativeApp();
  const [state, setState] = useState<ContentGuardState>({
    loading: native,
    status: EMPTY_STATUS,
  });
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!isNativeApp()) {
      setState({ loading: false, status: EMPTY_STATUS });
      return;
    }
    try {
      const status = await ContentGuard.getStatus();
      setState({ loading: false, status });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    // While the filter runs, poll blocked-counters so the number feels live.
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    pollRef.current = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const start = useCallback(
    async (mode: ContentFilterMode, rules?: { block: string[]; allow: string[] }) => {
      setBusy(true);
      try {
        if (rules) await ContentGuard.setRules({ rules });
        const res = await ContentGuard.start({ mode, rules });
        if (res.permissionNeeded) {
          toast.info("VPN অনুমতি দিন", { description: "সিস্টেম ডায়ালগে “OK” চাপলেই নিয়ন্ত্রণ চালু হবে।" });
        } else {
          toast.success("সামগ্রী নিয়ন্ত্রণ চালু হয়েছে");
        }
        await refresh();
        return res;
      } catch (err) {
        if (isVpnPermissionError(err)) {
          toast.error("VPN অনুমতি দরকার");
        } else {
          toast.error("নিয়ন্ত্রণ চালু করা যায়নি");
        }
        return { running: false };
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      await ContentGuard.stop();
      toast.success("সামগ্রী নিয়ন্ত্রণ বন্ধ করা হয়েছে");
      await refresh();
    } catch {
      toast.error("বন্ধ করা যায়নি");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const setRules = useCallback(async (rules: { block: string[]; allow: string[] }) => {
    try {
      await ContentGuard.setRules({ rules });
      toast.success("নিয়মগুলো সেভ হয়েছে");
    } catch {
      toast.error("নিয়ম সেভ করা যায়নি");
    }
  }, []);

  const loadRules = useCallback(async (): Promise<{ block: string[]; allow: string[] }> => {
    if (!isNativeApp()) return { block: [], allow: [] };
    try {
      const res = await ContentGuard.getRules();
      return res.rules;
    } catch {
      return { block: [], allow: [] };
    }
  }, []);

  return { ...state, native, busy, refresh, start, stop, setRules, loadRules };
}
