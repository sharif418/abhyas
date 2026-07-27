"use client";

import { useEffect } from "react";

/**
 * Registers the Service Worker for offline-first PWA support.
 * Only runs in production to avoid interfering with Next.js HMR in dev.
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
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // silent fail — SW is a progressive enhancement
        });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
