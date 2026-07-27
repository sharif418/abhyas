"use client";

import { useEffect } from "react";
import { useSettingsEffect } from "@/hooks/use-settings-effect";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { ViewRouter } from "./view-router";
import { HabitFormSheet } from "@/components/habits/habit-form";
import { HabitDetailSheet } from "@/components/habits/habit-detail";

/**
 * Root application shell.
 * Responsive: desktop = sidebar + content; mobile = bottom nav + content.
 * Hosts the global sheets (habit form & detail) once.
 */
export function AppShell() {
  useSettingsEffect();

  // lock body scroll when sheets are open is handled by radix; nothing extra.

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
    </div>
  );
}
