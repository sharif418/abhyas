"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Custom theme manager — bypasses next-themes entirely for the SET path.
 *
 * Problem: next-themes 0.4.x + Next.js 16 Turbopack can bundle next-themes
 * twice (one instance for the ThemeProvider in providers.tsx, another for
 * the useTheme() call in profile-view.tsx). The two instances create
 * separate React Context objects, so setTheme() from profile-view.tsx
 * writes to a different context than the ThemeProvider — the call is a
 * no-op, and the DOM class never updates.
 *
 * Solution: This hook reads the theme from localStorage (which next-themes
 *'s inline script also reads), and writes changes directly to both
 * localStorage AND the DOM. The inline script still handles the initial
 * SSR-safe load, but all subsequent updates go through this hook.
 *
 * This is a well-known workaround for next-themes + Turbopack issues.
 */

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
  localStorage.setItem("theme", theme);
}

export function useThemeManager() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return resolveTheme(getStoredTheme());
  });

  // No mount effect needed — the lazy initializers above read from localStorage
  // on the client. The system-theme listener below handles runtime changes.

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = resolveTheme("system");
      setResolvedTheme(r);
      applyTheme("system");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
    applyTheme(newTheme);
  }, []);

  return { theme, resolvedTheme, setTheme };
}
