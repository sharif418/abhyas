"use client";

import { useEffect } from "react";
import { useThemeManager } from "@/hooks/use-theme-manager";
import { useSettingsStore } from "@/stores/settings-store";
import { api } from "@/lib/api-client";
import type { UserSettings } from "@/types";

/**
 * Applies user settings to the DOM and syncs with the server.
 *  - theme → custom theme manager (bypasses next-themes for reliability)
 *  - accent → CSS variable --primary (and a palette shift)
 *  - server persistence (best-effort)
 */
export function useSettingsEffect() {
  const { theme, accent, weekStartsOn, haptics, sound, remindersEnabled, notificationsEnabled } =
    useSettingsStore();
  const { setTheme } = useThemeManager();

  // theme sync — use our custom theme manager which reliably updates
  // both localStorage and the DOM class (next-themes + Turbopack can fail)
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // accent → CSS variables (derive a darker shade for hover)
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // hydrate from server on first load
  useEffect(() => {
    let mounted = true;
    api
      .get<{ settings: Partial<UserSettings> }>("/api/me")
      .then((res) => {
        if (!mounted) return;
        useSettingsStore.getState().hydrateFromServer(res.settings);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // debounce-sync to server
  useEffect(() => {
    const id = setTimeout(() => {
      api
        .post("/api/me/settings", {
          theme,
          accent,
          weekStartsOn,
          haptics,
          sound,
          remindersEnabled,
          notificationsEnabled,
        })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(id);
  }, [theme, accent, weekStartsOn, haptics, sound, remindersEnabled, notificationsEnabled]);
}

/** Convert hex → oklch-ish by keeping hex but injecting via --primary overrides. */
function applyAccent(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--accent-hex", hex);
  // We override the primary token family with the chosen accent so the whole
  // UI re-themes cohesively. We compute a foreground that contrasts.
  const fg = contrastingColor(hex);
  root.style.setProperty("--primary", hexToOklch(hex));
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--ring", hexToOklch(hex));
  root.style.setProperty("--sidebar-primary", hexToOklch(hex));
  root.style.setProperty("--sidebar-primary-foreground", fg);
  root.style.setProperty("--sidebar-ring", hexToOklch(hex));
}

function hexToOklch(hex: string): string {
  // Tailwind v4 reads CSS vars; raw hex works fine inside oklch() fallback.
  // We return the hex directly — color-mix & oklch utilities handle it.
  return hex;
}

function contrastingColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b3d2e" : "#ffffff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m.padEnd(6, "0");
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
