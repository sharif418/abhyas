"use client";

/**
 * PWA install manager — the engine behind the install experience.
 *
 * Industry pattern (Chrome/Edge "rich install" + graceful iOS fallback):
 *  1. Chrome/Edge on Android fire `beforeinstallprompt` — we capture and
 *     suppress the browser's own mini-infobar, then show our branded Bengali
 *     banner at the right moment (user settled, 6s in, not dismissed recently).
 *     Accepting → `prompt()` → Android builds a real WebAPK: home-screen icon,
 *     splash screen, standalone window, OS push notifications.
 *  2. iOS Safari has no install API — we show Share → "Add to Home Screen"
 *     step-by-step instructions (industry standard on iOS).
 *  3. Inside the Capacitor Android shell there is nothing to install — the
 *     banner never renders there.
 *
 * Dismissals are remembered in localStorage for 3 days (non-permanent: a
 * visitor who declined in a hurry gets politely re-invited later, matching
 * Chrome's own guidance of never permanently nagging).
 */

export type InstallPlatform = "android" | "ios" | "desktop" | "other";

export interface InstallState {
  /** Chrome/Edge deferred prompt captured — one-tap native install available. */
  canInstall: boolean;
  /** Running as an installed PWA (standalone display-mode) or native app. */
  installed: boolean;
  /** Detected browser platform for choosing the right install UX. */
  platform: InstallPlatform;
  /** True while the deferred prompt dialog is on screen. */
  prompting: boolean;
}

const DISMISS_KEY = "abhyas.install.dismissedUntil";
const INSTALLED_KEY = "abhyas.install.installedAt";
/** 3 days — polite re-invite window after a dismissal. */
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallManagerState extends InstallState {
  deferred: BeforeInstallPromptEvent | null;
}

const state: InstallManagerState = {
  canInstall: false,
  installed: false,
  platform: "other",
  prompting: false,
  deferred: null,
};

/** Cached immutable snapshot — recreated only on change (useSyncExternalStore). */
let snapshot: InstallState = { ...state };

const listeners = new Set<() => void>();

function notify() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari never reports display-mode — use the proprietary flag.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function dismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = window.localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

export function dismissInstall(days: number = 3): void {
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + days * 24 * 60 * 60 * 1000)
    );
  } catch {
    /* private mode — next visit simply re-asks */
  }
  notify();
}

/** Should the banner be visible right now? (all gating in one predicate) */
export function shouldShowBanner(): boolean {
  return state.canInstall && !state.installed && !state.prompting && !dismissedRecently();
}

/**
 * Fire the captured native install prompt.
 * Returns "accepted" | "dismissed" | "unavailable".
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const deferred = state.deferred;
  if (!deferred) return "unavailable";
  state.prompting = true;
  notify();
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      try {
        window.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      return "accepted";
    }
    // User clicked "cancel" on the NATIVE dialog — treat as a soft dismissal
    // so we don't instantly re-show the banner.
    dismissInstall(1);
    return "dismissed";
  } finally {
    state.deferred = null;
    state.canInstall = false;
    state.prompting = false;
    notify();
  }
}

export function getInstallState(): InstallState {
  return snapshot;
}

/** Subscribe to install-state changes (useSyncExternalStore-friendly). */
export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Bootstrap listeners. Mounted once by <InstallBanner />; safe to call again
 * (idempotent — event handlers are only ever attached once).
 */
let booted = false;
export function bootInstallManager(): void {
  if (booted || typeof window === "undefined") return;
  booted = true;

  state.platform = detectPlatform();
  state.installed = isStandalone();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // suppress Chrome's own mini-infobar
    state.deferred = e as BeforeInstallPromptEvent;
    state.canInstall = true;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    state.installed = true;
    state.canInstall = false;
    state.deferred = null;
    try {
      window.localStorage.setItem(INSTALLED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    notify();
  });

  // PWA display-mode can change after install without a reload.
  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener?.("change", (e) => {
      state.installed = e.matches || isStandalone();
      notify();
    });

  notify();
}
