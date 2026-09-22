"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native/capacitor";

/**
 * UpdatePrompt — keeps every installed PWA current, automatically.
 *
 * Flow (the industry "controlled update" pattern):
 *  1. On app entry we ask the browser to check for a new Service Worker
 *     (the SW itself revalidates `sw.js` on each navigation as well).
 *  2. When a new worker finishes installing and sits in `registration.waiting`,
 *     we show a Bengali toast: "নতুন আপডেট প্রস্তুত" with a "হালনাগাদ করুন" action.
 *  3. The action posts { type: "SKIP_WAITING" }; the new worker activates,
 *     `controllerchange` fires and the page reloads — instantly on the new
 *     release. No manual reinstall, nothing to learn.
 *  4. If the user ignores the toast, the update still applies automatically
 *     the next time all app tabs are closed (standard SW lifecycle) — and we
 *     re-check periodically (15 min + on visibility) so long sessions stay
 *     fresh too.
 *
 * Inside the Capacitor native shell this is a no-op: the shell always loads
 * the live site, so updates land with every launch already.
 */

const TOAST_ID = "abhyas-update";

export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  // Reload exactly once when the new worker takes control.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  // Detect a waiting worker on a registration.
  const trackRegistration = useCallback((reg: ServiceWorkerRegistration) => {
    const sync = () => {
      setWaiting((prev) => {
        const next = reg.waiting;
        if (prev !== next && next) {
          // Surface the toast for the newly-waiting worker.
          queueUpdateToast(next, reg);
        }
        return next;
      });
    };
    reg.addEventListener?.("updatefound", () => {
      const installing = reg.installing;
      installing?.addEventListener?.("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          sync();
        }
      });
    });
    sync();
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production" ||
      isNativeApp()
    ) {
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || cancelled) return;
        trackRegistration(reg);
        // Ask the browser to look for a fresh sw.js in the background.
        await reg.update().catch(() => {});
      } catch {
        /* SW is a progressive enhancement — silent fail */
      }
    };

    void check();

    // Periodic + on-focus checks keep long-lived PWA sessions fresh.
    const interval = window.setInterval(check, 15 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [trackRegistration]);

  // Re-surface the toast if the component re-mounts with a waiting worker
  // (e.g. view switch in the SPA) — idempotent via the fixed toast id.
  useEffect(() => {
    if (waiting && !reloadingRef.current) {
      void navigator.serviceWorker
        ?.getRegistration()
        .then((reg) => reg && queueUpdateToast(waiting, reg));
    }
  }, [waiting]);

  return null;
}

/** Show (or refresh) the Bengali update toast with a one-tap action. */
function queueUpdateToast(worker: ServiceWorker, reg: ServiceWorkerRegistration) {
  const apply = () => {
    worker.postMessage({ type: "SKIP_WAITING" });
  };

  toast("নতুন আপডেট প্রস্তুত", {
    id: TOAST_ID,
    description: "হালনাগাদ করলে সর্বশেষ ফিচার ও ঠিকঠাক কাজ পাবেন।",
    duration: Infinity,
    action: {
      label: "হালনাগাদ করুন",
      onClick: apply,
    },
    dismissible: true,
    onDismiss: () => {
      // Declined for now — will be offered again next visit (or when all
      // tabs close, the standard SW lifecycle applies it anyway).
      void reg.update().catch(() => {});
    },
  });
}
