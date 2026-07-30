"use client";

import { useEffect } from "react";
import { useSettingsEffect } from "@/hooks/use-settings-effect";
import { useNotifications } from "@/hooks/use-notifications";
import { useUIStore } from "@/stores/ui-store";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { ViewRouter } from "./view-router";
import { HabitFormSheet } from "@/components/habits/habit-form";
import { HabitDetailSheet } from "@/components/habits/habit-detail";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { ServiceWorkerRegister } from "@/components/app/sw-register";
import { KeyboardShortcutsOverlay } from "@/components/app/keyboard-shortcuts";
import type { ViewKey } from "@/types";

/**
 * Root application shell.
 * Responsive: desktop = sidebar + content; mobile = bottom nav + content.
 * Hosts the global sheets (habit form, detail, onboarding) once.
 */
export function AppShell() {
  useSettingsEffect();
  useNotifications();

  // Keyboard navigation: number keys 1-8 switch views, N opens add habit
  useEffect(() => {
    const viewMap: Record<string, ViewKey> = {
      "1": "home",
      "2": "habits",
      "3": "focus",
      "4": "stats",
      "5": "islamic",
      "6": "journal",
      "7": "social",
      "8": "profile",
    };

    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Number keys for view navigation
      if (viewMap[e.key]) {
        e.preventDefault();
        useUIStore.getState().setView(viewMap[e.key]);
      }

      // N for new habit
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

      {/* Global overlays */}
      <HabitFormSheet />
      <HabitDetailSheet />
      <OnboardingModal />
      <KeyboardShortcutsOverlay />
      <ServiceWorkerRegister />
    </div>
  );
}
