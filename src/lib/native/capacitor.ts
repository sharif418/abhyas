"use client";

/**
 * Capacitor platform detection helpers.
 *
 * The web app (this Next.js codebase) is ALSO the UI layer of the native
 * Android app: the Capacitor shell (`android/`) loads the deployed site and
 * injects a JS bridge. When that bridge exists, `isNativeApp()` returns true
 * and features can escalate from web fallbacks to real OS-level control
 * (e.g. system-wide Do-Not-Disturb via the FocusMode plugin).
 *
 * Everything here is SSR-safe: on the server (no `window`) we always report
 * "not native" so server renders match plain browsers.
 */

import { Capacitor } from "@capacitor/core";

export type NativePlatform = "android" | "ios" | "web";

/** True when running inside a Capacitor native shell (Android APK/IPA). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Which native shell (or "web") the app is running in.
 * Android is the primary target; iOS support can be added later without
 * web-side changes because detection is dynamic.
 */
export function getNativePlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return p;
    return "web";
  } catch {
    return "web";
  }
}
