"use client";

/**
 * UsageGuard native plugin bridge — per-app daily time budgets.
 *
 * ── Native (Android) contract ──────────────────────────────────────────────
 * `android/app/src/main/java/bd/abhyas/app/UsageGuardPlugin.java` implements
 * the SAME methods with Android's UsageStatsManager:
 *
 *   • Permission: `PACKAGE_USAGE_STATS` special access. The user grants it
 *     once from Settings → Special app access → Usage access
 *     (Settings.ACTION_USAGE_ACCESS_SETTINGS). Nothing is granted silently.
 *   • `getApps()`         → launchable apps (label + small base64 icon).
 *   • `getUsageToday()`   → per-app foreground minutes TODAY (midnight-local
 *                           reset) + the limit stored for each app.
 *   • `setLimit()`        → persists {package → minutes/day} in SharedPreferences.
 *   • `setEnforcement()`  → starts/stops UsageGuardService, a foreground
 *                           service that re-checks usage every ~60s and fires
 *                           a "সময় শেষ — অভ্যাসে ফিরে আসুন" notification when a
 *                           budget is crossed (tap → opens অভ্যাস).
 *   • `setInterception()` / `getInterceptionStatus()` /
 *     `requestOverlayPermission()` → the block screen: when an over-budget
 *     app is OPEN, a calm full-screen overlay (SYSTEM_ALERT_WINDOW) pulls
 *     the user back, with a per-app daily cooldown ("৫ মিনিট বিরতি")।
 *   • `getUsageRange({days})` → per-day per-app minutes for the last N days
 *     (≤ 14) — the data behind the স্ক্রিন-টাইম রিপোর্ট।
 *   • `getSleepEstimate()` → last night's device-local sleep estimate
 *     (longest phone-untouched gap) + the recorded 7-night history.
 *
 * PRIVACY: usage data NEVER leaves the device; no app names/times are synced.
 *
 * ── Web (browser / PWA) ────────────────────────────────────────────────────
 * Browsers cannot see other apps' usage — an OS boundary, not a missing
 * feature. The web implementation returns empty data and `ok: false` so the
 * UI can show an honest "অ্যান্ড্রয়েড অ্যাপ লাগবে" state with the install CTA.
 */

import { registerPlugin } from "@capacitor/core";

export interface AppInfo {
  packageName: string;
  label: string;
  /** Base64-encoded small launcher icon (PNG), when cheaply available. */
  icon?: string | null;
}

export interface AppUsage {
  packageName: string;
  label: string;
  /** Foreground minutes so far today. */
  todayMinutes: number;
  /** Daily budget in minutes; 0 = no limit set. */
  limitMinutes: number;
  /** True when todayMinutes ≥ limitMinutes (> 0). */
  overLimit: boolean;
}

export interface UsageAccessStatus {
  granted: boolean;
}

export interface UsageRequestAccessResult {
  granted: boolean;
  opened: boolean;
}

export interface AppsResult {
  apps: AppInfo[];
}

export interface UsageResult {
  apps: AppUsage[];
  /** True while the background watchdog service runs. */
  enforcementActive: boolean;
}

export interface OkResult {
  ok: boolean;
}

export interface EnforcementResult {
  active: boolean;
}

/** State of the block-screen interceptor for the নিয়ন্ত্রণ কেন্দ্র card. */
export interface InterceptionStatus {
  /** Armed by the user (per-app budgets apply + overlay shown when crossed). */
  enabled: boolean;
  /** "Display over other apps" special access granted. */
  overlayGranted: boolean;
  /** True while the watchdog service runs (the fast loop lives inside it). */
  serviceRunning: boolean;
  /** Overlays shown today — the "কতবার থামানো হলো" number. */
  blockedToday: number;
}

export interface InterceptionToggleResult {
  enabled: boolean;
}

export interface OverlayPermissionResult {
  granted: boolean;
  opened: boolean;
}

/** One day of the screen-time range (apps sorted by minutes, desc). */
export interface UsageRangeDay {
  /** "YYYY-MM-DD" (device-local). */
  date: string;
  totalMinutes: number;
  apps: { packageName: string; label: string; minutes: number }[];
}

export interface UsageRangeResult {
  days: UsageRangeDay[];
}

/** One recorded night (device-local estimate; never invented). */
export interface SleepNight {
  date?: string;
  startMs: number;
  endMs: number;
  minutes: number;
}

export interface SleepEstimateResult {
  lastNight: SleepNight | null;
  history: SleepNight[];
}

export interface UsageGuardPlugin {
  isAccessGranted(): Promise<UsageAccessStatus>;
  requestAccess(): Promise<UsageRequestAccessResult>;
  getApps(): Promise<AppsResult>;
  getUsageToday(): Promise<UsageResult>;
  setLimit(options: { packageName: string; minutesPerDay: number }): Promise<OkResult>;
  removeLimit(options: { packageName: string }): Promise<OkResult>;
  setEnforcement(options: { enabled: boolean }): Promise<EnforcementResult>;
  setInterception(options: { enabled: boolean }): Promise<InterceptionToggleResult>;
  getInterceptionStatus(): Promise<InterceptionStatus>;
  requestOverlayPermission(): Promise<OverlayPermissionResult>;
  getUsageRange(options: { days: number }): Promise<UsageRangeResult>;
  getSleepEstimate(): Promise<SleepEstimateResult>;
}

/** Error codes the Java plugin rejects with. */
export const ERR_USAGE_ACCESS_REQUIRED = "USAGE_ACCESS_REQUIRED";
export const ERR_USAGE_UNSUPPORTED = "UNSUPPORTED";

// ---------------------------------------------------------------------------
// Web implementation — honest "needs the Android app" fallback
// ---------------------------------------------------------------------------

class UsageGuardWeb implements UsageGuardPlugin {
  async isAccessGranted(): Promise<UsageAccessStatus> {
    return { granted: false };
  }

  async requestAccess(): Promise<UsageRequestAccessResult> {
    return { granted: false, opened: false };
  }

  async getApps(): Promise<AppsResult> {
    return { apps: [] };
  }

  async getUsageToday(): Promise<UsageResult> {
    return { apps: [], enforcementActive: false };
  }

  async setLimit(): Promise<OkResult> {
    return { ok: false };
  }

  async removeLimit(): Promise<OkResult> {
    return { ok: false };
  }

  async setEnforcement(): Promise<EnforcementResult> {
    return { active: false };
  }

  async setInterception(): Promise<InterceptionToggleResult> {
    return { enabled: false };
  }

  async getInterceptionStatus(): Promise<InterceptionStatus> {
    return { enabled: false, overlayGranted: false, serviceRunning: false, blockedToday: 0 };
  }

  async requestOverlayPermission(): Promise<OverlayPermissionResult> {
    return { granted: false, opened: false };
  }

  async getUsageRange(): Promise<UsageRangeResult> {
    return { days: [] };
  }

  async getSleepEstimate(): Promise<SleepEstimateResult> {
    return { lastNight: null, history: [] };
  }
}

export const UsageGuard = registerPlugin<UsageGuardPlugin>("UsageGuard", {
  web: () => new UsageGuardWeb(),
});

/** True when a plugin call failed for missing usage access. */
export function isUsageAccessError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === ERR_USAGE_ACCESS_REQUIRED
  );
}
