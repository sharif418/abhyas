"use client";

import { useEffect } from "react";
import { useSettingsEffect } from "@/hooks/use-settings-effect";
import { useNotifications } from "@/hooks/use-notifications";
import { useUIStore, bindHistoryNavigation } from "@/stores/ui-store";
import { ALL_VIEWS } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { ViewRouter } from "./view-router";
import { HabitFormSheet } from "@/components/habits/habit-form";
import { HabitDetailSheet } from "@/components/habits/habit-detail";
import { TemplatesModal } from "@/components/habits/templates-modal";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { FloatingFocusButton } from "@/components/focus/floating-focus-button";
import { ServiceWorkerRegister } from "@/components/app/sw-register";
import { KeyboardShortcutsOverlay } from "@/components/app/keyboard-shortcuts";
import { InstallBanner } from "@/components/pwa/install-banner";
import { UpdatePrompt } from "@/components/pwa/update-prompt";

/** True while any Radix dialog/sheet/drawer is mounted (focus is trapped in it). */
function anyOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.querySelector('[role="dialog"][data-state="open"]') !== null ||
    document.querySelector('[data-slot="drawer-content"]') !== null
  );
}

/**
 * Root application shell.
 * Responsive: desktop = sidebar + content; mobile = bottom nav + content.
 * Hosts the global overlays (habit form, detail, templates, onboarding).
 */
export function AppShell() {
  useSettingsEffect();
  useNotifications();

  const templatesOpen = useUIStore((s) => s.templatesOpen);
  const setTemplatesOpen = useUIStore((s) => s.setTemplatesOpen);

  // URL ↔ view sync: back/forward buttons + deep links (#/islamic …).
  useEffect(() => bindHistoryNavigation(), []);

  // Keyboard navigation: number keys 1–8 switch views, N opens add habit.
  useEffect(() => {
    const viewMap = Object.fromEntries(
      ALL_VIEWS.map((v, i) => [String(i + 1), v.key])
    ) as Record<string, (typeof ALL_VIEWS)[number]["key"]>;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs…
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // …or while any modal/sheet is open (focus is trapped inside it, so a
      // stray "3" would silently discard in-progress form input).
      const ui = useUIStore.getState();
      if (ui.addHabitOpen || ui.selectedHabitId || ui.moreSheetOpen || anyOverlayOpen()) {
        return;
      }

      if (viewMap[e.key]) {
        e.preventDefault();
        useUIStore.getState().setView(viewMap[e.key]);
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        useUIStore.getState().openAddHabit();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex min-h-screen flex-1">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <ViewRouter />
        </div>
      </div>
      <BottomNav />

      {/* Global focus-mode control — present on every view */}
      <FloatingFocusButton />

      {/* PWA install invitation + auto-update flow */}
      <InstallBanner />
      <UpdatePrompt />

      {/* Global overlays */}
      <HabitFormSheet />
      <HabitDetailSheet />
      <TemplatesModal open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <OnboardingModal />
      <KeyboardShortcutsOverlay />
      <ServiceWorkerRegister />
    </div>
  );
}
