"use client";

import { create } from "zustand";
import type { ViewKey } from "@/types";

interface UIState {
  view: ViewKey;
  selectedHabitId: string | null;
  addHabitOpen: boolean;
  editingHabitId: string | null;
  moreSheetOpen: boolean;
  templatesOpen: boolean;
  setView: (v: ViewKey) => void;
  openAddHabit: () => void;
  openEditHabit: (id: string) => void;
  closeHabitForm: () => void;
  openHabitDetail: (id: string) => void;
  closeHabitDetail: () => void;
  setMoreSheetOpen: (open: boolean) => void;
  setTemplatesOpen: (open: boolean) => void;
}

/**
 * Client-side view router.
 *
 * The whole app lives on a single `/` route (PWA-first decision: instant,
 * app-like tab switching with no network round-trips), but the active view is
 * **synced to the URL hash** (`#/home`, `#/islamic`, …) through the History
 * API so users get:
 *  - working browser/PWA back & forward buttons,
 *  - shareable deep links (e.g. `https://…/#/islamic`),
 *  - view persistence across refreshes.
 */
const VIEW_KEYS: ViewKey[] = [
  "home",
  "habits",
  "stats",
  "islamic",
  "social",
  "journal",
  "focus",
  "profile",
];

/** Parse `#/islamic` → "islamic"; returns null for unknown/absent hashes. */
function viewFromHash(hash: string): ViewKey | null {
  const slug = hash.replace(/^#\/?/, "").split(/[?/]/)[0];
  return (VIEW_KEYS as string[]).includes(slug) ? (slug as ViewKey) : null;
}

/** Push `#/view` onto the history stack (no re-render, no hashchange event). */
function pushViewToHistory(view: ViewKey) {
  if (typeof window === "undefined") return;
  if (viewFromHash(window.location.hash) === view) return;
  window.history.pushState({ view }, "", `#/${view}`);
}

const initialView: ViewKey =
  typeof window !== "undefined" ? (viewFromHash(window.location.hash) ?? "home") : "home";

export const useUIStore = create<UIState>((set) => ({
  view: initialView,
  selectedHabitId: null,
  addHabitOpen: false,
  editingHabitId: null,
  moreSheetOpen: false,
  templatesOpen: false,
  setView: (view) => {
    set({ view, selectedHabitId: null, addHabitOpen: false, editingHabitId: null });
    pushViewToHistory(view);
  },
  openAddHabit: () => set({ addHabitOpen: true, editingHabitId: null }),
  openEditHabit: (id) => set({ addHabitOpen: true, editingHabitId: id }),
  closeHabitForm: () => set({ addHabitOpen: false, editingHabitId: null }),
  openHabitDetail: (id) => set({ selectedHabitId: id }),
  closeHabitDetail: () => set({ selectedHabitId: null }),
  setMoreSheetOpen: (open) => set({ moreSheetOpen: open }),
  setTemplatesOpen: (open) => set({ templatesOpen: open }),
}));

/**
 * Wire browser back/forward to the view router. Mounted once by `<AppShell>`.
 *
 * Handles three history cases:
 *  1. `event.state.view` — entries we pushed via `setView` (precise).
 *  2. plain `#/view` hash — deep links from outside / manual edits.
 *  3. anything else (e.g. first entry, no hash) — Home.
 */
export function bindHistoryNavigation() {
  if (typeof window === "undefined") return () => {};

  // Normalize the initial entry so it carries the starting view.
  window.history.replaceState(
    { view: useUIStore.getState().view },
    "",
    `#/${useUIStore.getState().view}`
  );

  const onPopState = (e: PopStateEvent) => {
    const next =
      (e.state as { view?: ViewKey } | null)?.view ??
      viewFromHash(window.location.hash) ??
      "home";
    useUIStore.setState({ view: next, selectedHabitId: null, addHabitOpen: false, editingHabitId: null });
  };

  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}
