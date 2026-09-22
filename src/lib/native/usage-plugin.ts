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

export interface UsageGuardPlugin {
  isAccessGranted(): Promise<UsageAccessStatus>;
  requestAccess(): Promise<UsageRequestAccessResult>;
  getApps(): Promise<AppsResult>;
  getUsageToday(): Promise<UsageResult>;
  setLimit(options: { packageName: string; minutesPerDay: number }): Promise<OkResult>;
  removeLimit(options: { packageName: string }): Promise<OkResult>;
  setEnforcement(options: { enabled: boolean }): Promise<EnforcementResult>;
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
