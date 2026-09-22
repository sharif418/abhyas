"use client";

/**
 * ইবাদত মোড — platform capability layer.
 *
 * The web platform's strongest "take over the phone" primitives, used to give
 * users a distraction-free ইবাদত (Quran/Zikr) session:
 *
 *  1. Fullscreen API        — hides browser UI; the app owns the whole screen.
 *  2. Screen Wake Lock API  — the screen never sleeps mid-ইবাদত.
 *  3. Vibration API         — haptic feedback on each তাসবিহ tap.
 *  4. Notification pause    — our own push notifications are suppressed
 *                             server-side while the session is active.
 *
 * (Blocking OTHER apps' notifications — WhatsApp/Messenger — is an OS-level
 * permission only native apps can request; the UI teaches users to enable
 * the device's Do-Not-Disturb instead, which is the honest platform limit.)
 */

// ---------------------------------------------------------------------------
// Wake Lock
// ---------------------------------------------------------------------------

let wakeLock: WakeLockSentinel | null = null;

/** Whether this browser exposes the Screen Wake Lock API. */
export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** Request a screen wake lock. Safe to call repeatedly (no-ops if held). */
export async function acquireWakeLock(): Promise<boolean> {
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
  try {
    wakeLock?.release();
  } catch {
    /* already released */
  }
  wakeLock = null;
}

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

/** Whether the document can enter fullscreen (user gesture required). */
export function fullscreenSupported(): boolean {
  return typeof document !== "undefined" && !!document.documentElement.requestFullscreen;
}

/** Enter fullscreen on the whole document. */
export async function enterFullscreen(): Promise<boolean> {
  if (!fullscreenSupported() || document.fullscreenElement) return !!document.fullscreenElement;
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
