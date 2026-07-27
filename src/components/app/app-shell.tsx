"use client";

import { useSettingsEffect } from "@/hooks/use-settings-effect";
import { useNotifications } from "@/hooks/use-notifications";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { ViewRouter } from "./view-router";
import { HabitFormSheet } from "@/components/habits/habit-form";
import { HabitDetailSheet } from "@/components/habits/habit-detail";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { ServiceWorkerRegister } from "@/components/app/sw-register";

/**
 * Root application shell.
 * Responsive: desktop = sidebar + content; mobile = bottom nav + content.
 * Hosts the global sheets (habit form, detail, onboarding) once.
 */
export function AppShell() {
  useSettingsEffect();
  useNotifications();

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
      <ServiceWorkerRegister />
    </div>
  );
}
