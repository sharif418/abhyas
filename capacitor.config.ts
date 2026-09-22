import type { CapacitorConfig } from "@capacitor/cli";

/**
 * অভ্যাস — Capacitor (hybrid) native shell configuration.
 *
 * ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────
 * The Next.js web app stays the single UI codebase AND the single deployment
 * (Coolify + webhook). The Android shell (android/) is a thin native wrapper
 * that loads the LIVE deployed site, so every web release is instantly in the
 * app with zero app-store updates — while native plugins escalate to real
 * OS-level capabilities the browser can never have:
 *
 *   • FocusMode plugin → system-wide Do-Not-Disturb (the floating button)
 *   • UsageGuard plugin → per-app social-media time budgets + watchdog
 *     notifications (“অভ্যাসে ফিরে আসুন”) when a budget is crossed
 *   • ContentGuard plugin → DNS-level content filter (family/security/ads
 *     modes + custom block/allow rules) via a DNS-only VpnService tunnel
 *
 * SERVER URL
 * ─────────────────────────────────────────────────────────────────────────
 * `server.url` is baked into the APK at build time. It must be the public
 * Coolify URL of the web app. Override per environment:
 *
 *   CAP_SERVER_URL=https://staging.example.com bunx cap sync android
 *
 * (If the domain ever changes permanently, change the default below and run
 * `bunx cap sync android`, then rebuild the APK.)
 */
const SERVER_URL =
  process.env.CAP_SERVER_URL ?? "https://abhyas.ailearnersbd.com";

const config: CapacitorConfig = {
  appId: "bd.abhyas.app",
  appName: "অভ্যাস",
  // Local fallback page (shown when the remote server is unreachable).
  // The remote SERVER_URL above is the primary content source.
  webDir: "capacitor-web",
  server: {
    url: SERVER_URL,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
