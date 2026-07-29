"use client";

import { useEffect } from "react";

/**
 * Registers the Service Worker for offline-first PWA support + push notifications.
 *
 * Only runs in production to avoid interfering with Next.js HMR in dev.
 *
 * The SW is critical for:
 *  - Offline caching (stale-while-revalidate)
 *  - Web Push notifications (push event handler)
 *  - Background sync (offline mutation queue)
 *
 * We register as early as possible and retry once if the first attempt
 * fails (e.g. if /sw.js wasn't cached yet on first visit).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let cancelled = false;

    const doRegister = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (!cancelled) {
          // Trigger an update check so users get the latest SW promptly
          reg.update().catch(() => {});
        }
      } catch {
        // Silent fail — SW is a progressive enhancement.
        // The push subscription flow will retry registration on demand.
      }
    };

    // Register immediately if document is already loaded, otherwise on load.
    if (document.readyState === "complete") {
      doRegister();
    } else {
      window.addEventListener("load", doRegister);
    }

    // Also register on first user interaction as a fallback — some browsers
    // delay SW registration until after the first interaction.
    const onFirstInteraction = () => {
      doRegister();
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
    window.addEventListener("click", onFirstInteraction, { once: true });
    window.addEventListener("touchstart", onFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", doRegister);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
  }, []);
  return null;
}
