"use client";

/**
 * Web platform capability primitives (fullscreen, wake lock, haptics).
 *
 * Extracted from the old ইবাদত মোড layer so every feature — the Focus
 * Pomodoro timer, the global floating Focus button's web fallback — shares
 * ONE hardened implementation instead of per-feature copies.
 *
 * All calls degrade gracefully: unsupported browsers get `false` / no-ops.
 */

// ---------------------------------------------------------------------------
// Wake Lock
// ---------------------------------------------------------------------------

let wakeLock: WakeLockSentinel | null = null;
/** True while some feature wants the screen kept awake (survives tab-hidden). */
let wakeLockWanted = false;

/** Whether this browser exposes the Screen Wake Lock API. */
export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** Request a screen wake lock. Safe to call repeatedly (no-ops if held). */
export async function acquireWakeLock(): Promise<boolean> {
  wakeLockWanted = true;
  if (!wakeLockSupported()) return false;
  try {
    if (!wakeLock || wakeLock.released) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener?.("release", () => {
        wakeLock = null;
      });
    }
    return true;
  } catch {
    // Denied (e.g. tab hidden, battery saver) — degrade gracefully.
    return false;
  }
}

/** Release the screen wake lock (no-op when not held). */
export function releaseWakeLock(): void {
  wakeLockWanted = false;
  try {
    wakeLock?.release();
  } catch {
    /* already released */
  }
  wakeLock = null;
}

/**
 * Re-acquire the wake lock after the tab becomes visible again — the browser
 * silently releases wake locks whenever the document is hidden.
 */
export async function reacquireWakeLockIfVisible(): Promise<void> {
  if (
    wakeLockWanted &&
    wakeLockSupported() &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  ) {
    await acquireWakeLock();
  }
}

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

/** Whether the document can enter fullscreen (user gesture required). */
export function fullscreenSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    !!document.documentElement.requestFullscreen
  );
}

/** Enter fullscreen on the whole document. */
export async function enterFullscreen(): Promise<boolean> {
  if (!fullscreenSupported() || document.fullscreenElement)
    return !!document.fullscreenElement;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

/** Exit fullscreen if currently active. */
export async function exitFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/** Short haptic pulse; respects length (ms). No-op on desktop. */
export function hapticPulse(ms = 20): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
