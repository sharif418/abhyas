"use client";

/**
 * FocusMode native plugin bridge.
 *
 * ── Native (Android) ──────────────────────────────────────────────────────
 * `android/app/src/main/java/bd/abhyas/app/FocusModePlugin.kt` implements the
 * SAME five methods with Android's NotificationManager:
 *   - `ACCESS_NOTIFICATION_POLICY` (Do-Not-Disturb access) gates everything,
 *   - `enable()`  → `setInterruptionFilter(INTERRUPTION_FILTER_NONE)`
 *                   (system-wide total silence: every app's notifications,
 *                   calls and ringtones are suppressed at the OS level),
 *   - `disable()` → restores the interruption filter the phone had before.
 *
 * ── Web (browser / PWA) ───────────────────────────────────────────────────
 * Browsers cannot touch other apps' notifications — that is an OS boundary,
 * not a missing feature. The web implementation therefore provides an honest
 * SOFT focus: document fullscreen + screen wake lock, so reading inside the
 * app stays distraction-free while the Android app offers the real thing.
 */

import { registerPlugin } from "@capacitor/core";
import {
  acquireWakeLock,
  enterFullscreen,
  exitFullscreen,
  releaseWakeLock,
} from "@/lib/web-platform";

// ---------------------------------------------------------------------------
// Contract (shared by Kotlin + web implementations)
// ---------------------------------------------------------------------------

export interface AccessStatus {
  /** Whether Do-Not-Disturb access has been granted (always true on web). */
  granted: boolean;
}

export interface RequestAccessResult {
  granted: boolean;
  /** True when the plugin opened the OS settings screen. */
  opened: boolean;
}

export interface FocusStatus {
  granted: boolean;
  /** True while notifications are actually suppressed right now. */
  active: boolean;
}

export interface FocusToggleResult {
  active: boolean;
  /** Web fallback only: whether document fullscreen was granted. */
  fullscreen?: boolean;
  /** Web fallback only: whether the screen wake lock was acquired. */
  wakeLock?: boolean;
}

export interface FocusModePlugin {
  isAccessGranted(): Promise<AccessStatus>;
  requestAccess(): Promise<RequestAccessResult>;
  getStatus(): Promise<FocusStatus>;
  enable(): Promise<FocusToggleResult>;
  disable(): Promise<FocusToggleResult>;
  /** ডিস্ট্রাকশন-ফ্রি ইবাদত: pin our own activity (Android 6.0+). */
  isScreenPinSupported(): Promise<ScreenPinSupport>;
  startScreenPin(): Promise<ScreenPinResult>;
  stopScreenPin(): Promise<ScreenPinResult>;
}

export interface ScreenPinSupport {
  supported: boolean;
}

export interface ScreenPinResult {
  pinned: boolean;
}

/** Error code the Kotlin plugin rejects with when DND access is missing. */
export const ERR_DND_ACCESS_REQUIRED = "DND_ACCESS_REQUIRED";

// ---------------------------------------------------------------------------
// Web implementation — honest soft focus
// ---------------------------------------------------------------------------

class FocusModeWeb implements FocusModePlugin {
  private softActive = false;

  async isAccessGranted(): Promise<AccessStatus> {
    // Soft focus needs no OS permission (fullscreen may prompt per-gesture).
    return { granted: true };
  }

  async requestAccess(): Promise<RequestAccessResult> {
    return { granted: true, opened: false };
  }

  async getStatus(): Promise<FocusStatus> {
    return { granted: true, active: this.softActive };
  }

  async enable(): Promise<FocusToggleResult> {
    this.softActive = true;
    // Both are best-effort: the session still counts if either is denied
    // (e.g. iOS Safari has no wake lock; fullscreen can be ESCaped).
    const fullscreen = await enterFullscreen();
    const wakeLock = await acquireWakeLock();
    return { active: true, fullscreen, wakeLock };
  }

  async disable(): Promise<FocusToggleResult> {
    this.softActive = false;
    await exitFullscreen();
    releaseWakeLock();
    return { active: false };
  }

  async isScreenPinSupported(): Promise<ScreenPinSupport> {
    // Browser tabs cannot be pinned against the OS — honest no.
    return { supported: false };
  }

  async startScreenPin(): Promise<ScreenPinResult> {
    return { pinned: false };
  }

  async stopScreenPin(): Promise<ScreenPinResult> {
    return { pinned: false };
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const FocusMode = registerPlugin<FocusModePlugin>("FocusMode", {
  web: () => new FocusModeWeb(),
});

/** True when the plugin call failed for missing DND permission. */
export function isDndAccessError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === ERR_DND_ACCESS_REQUIRED
  );
}
