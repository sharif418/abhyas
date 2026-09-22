"use client";

/**
 * ContentGuard native plugin bridge — DNS-level content filtering.
 *
 * ── Native (Android) contract ──────────────────────────────────────────────
 * `android/app/src/main/java/bd/abhyas/app/ContentGuardPlugin.java` +
 * `DnsVpnService.java` implement a local DNS-filter VPN (the pattern used by
 * Blokada / personalDNSfilter / RethinkDNS):
 *
 *   • VPN consent: Android shows the system VPN dialog on first start
 *     (VpnService.prepare()) — the user approves once; nothing silent.
 *   • A DNS-ONLY tunnel: the system's DNS queries (+ queries to hardcoded
 *     public resolvers like 8.8.8.8) enter our TUN device.
 *   • Mode → upstream resolver:
 *       family   → CleanBrowsing Family (185.228.168.168) — blocks adult
 *                  content + mixed-content sites.
 *       security → Quad9 (9.9.9.9) — blocks malware/phishing.
 *       ads      → AdGuard DNS (94.140.14.14) — blocks ads + trackers.
 *       custom   → Cloudflare (1.1.1.1) plain + the user's own block rules.
 *   • Custom rules: `block: string[]` (domains, wildcards like *.example.com)
 *     are answered locally with an empty/refused response; `allow: string[]`
 *     always passes through even in family mode.
 *   • Non-DNS traffic is untouched (no full-tunnel routes are added).
 *   • `getStats()` → blocked/total DNS queries today (device-local only).
 *
 * PRIVACY: the VPN sees only domain names; contents (HTTPS) are always
 * invisible. No browsing data leaves the device. The filter can be turned
 * OFF any time from this screen (a hard requirement from the product owner).
 *
 * ── Web (browser / PWA) ────────────────────────────────────────────────────
 * Browsers cannot change system DNS — an OS boundary. Web implementation
 * reports not-running and `ok: false` so the UI shows the honest
 * "অ্যান্ড্রয়েড অ্যাপ লাগবে" state with the install CTA.
 */

import { registerPlugin } from "@capacitor/core";

export type ContentFilterMode = "family" | "security" | "ads" | "custom";

export interface ContentGuardStatus {
  running: boolean;
  mode: ContentFilterMode | null;
  /** DNS queries blocked today (device-local counter). */
  blockedToday: number;
  /** Total DNS queries seen today. */
  totalToday: number;
}

export interface ContentRules {
  block: string[];
  allow: string[];
}

export interface StartOptions {
  mode: ContentFilterMode;
  rules?: ContentRules;
}

export interface StartResult {
  running: boolean;
  /** True when the system VPN-consent dialog was shown (not yet granted). */
  permissionNeeded?: boolean;
}

export interface StatsResult {
  blockedToday: number;
  totalToday: number;
}

export interface OkResult {
  ok: boolean;
}

export interface ContentGuardPlugin {
  getStatus(): Promise<ContentGuardStatus>;
  start(options: StartOptions): Promise<StartResult>;
  stop(): Promise<OkResult>;
  getStats(): Promise<StatsResult>;
  getRules(): Promise<{ rules: ContentRules }>;
  setRules(options: { rules: ContentRules }): Promise<OkResult>;
}

/** Error codes the Java plugin rejects with. */
export const ERR_VPN_PERMISSION_REQUIRED = "VPN_PERMISSION_REQUIRED";
export const ERR_CONTENTGUARD_UNSUPPORTED = "UNSUPPORTED";

// ---------------------------------------------------------------------------
// Web implementation — honest "needs the Android app" fallback
// ---------------------------------------------------------------------------

class ContentGuardWeb implements ContentGuardPlugin {
  async getStatus(): Promise<ContentGuardStatus> {
    return { running: false, mode: null, blockedToday: 0, totalToday: 0 };
  }

  async start(): Promise<StartResult> {
    return { running: false };
  }

  async stop(): Promise<OkResult> {
    return { ok: false };
  }

  async getStats(): Promise<StatsResult> {
    return { blockedToday: 0, totalToday: 0 };
  }

  async getRules(): Promise<{ rules: ContentRules }> {
    return { rules: { block: [], allow: [] } };
  }

  async setRules(): Promise<OkResult> {
    return { ok: false };
  }
}

export const ContentGuard = registerPlugin<ContentGuardPlugin>("ContentGuard", {
  web: () => new ContentGuardWeb(),
});

/** True when a plugin call failed because VPN consent is missing. */
export function isVpnPermissionError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === ERR_VPN_PERMISSION_REQUIRED
  );
}
