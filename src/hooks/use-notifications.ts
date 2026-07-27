"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useHabits } from "@/hooks/use-habits";
import type { HabitWithMeta } from "@/types";

const NOTIFIED_KEY = "abhyas-notified-today";

/**
 * useNotifications — wires the settings toggles to the browser Notification API.
 *
 * Behavior:
 *  - When `notificationsEnabled` is on, requests permission (if not already).
 *  - Checks for incomplete scheduled habits hourly; if any habit with a
 *    reminderTime matches the current hour (and not yet completed today, and
 *    not yet notified today), fires a notification.
 *  - "Perfect day" + streak-break warnings are handled by the toggle hook's
 *    toast/confetti system (in-app); this hook is for OS-level notifications.
 */
export function useNotifications() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const { data: habits } = useHabits();

  // request permission when enabled flips on
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);

  // periodic reminder check
  useEffect(() => {
    if (!enabled || !remindersEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!habits || habits.length === 0) return;

    const check = () => checkReminders(habits);
    // check every 15 minutes
    const id = setInterval(check, 15 * 60 * 1000);
    // also check shortly after mount
    const initial = setTimeout(check, 5000);
    return () => {
      clearInterval(id);
      clearTimeout(initial);
    };
  }, [enabled, remindersEnabled, habits]);
}

function checkReminders(habits: HabitWithMeta[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  // load already-notified set for today
  let notified: string[] = [];
  try {
    const raw = localStorage.getItem(`${NOTIFIED_KEY}-${todayKey}`);
    notified = raw ? JSON.parse(raw) : [];
  } catch {
    /* ignore */
  }

  const newNotified = [...notified];
  for (const h of habits) {
    if (h.completedToday) continue;
    if (!h.reminderTime) continue;
    if (notified.includes(h.id)) continue;

    // fire if reminder time is within the last 15 minutes (or exactly now)
    const [rh, rm] = h.reminderTime.split(":").map(Number);
    const reminderMin = rh * 60 + rm;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= reminderMin && nowMin - reminderMin <= 15) {
      try {
        new Notification(`⏰ ${h.name}`, {
          body: `এটি সম্পন্ন করার সময় হয়েছে। স্ট্রিক: ${h.streak} দিন`,
          tag: `habit-${h.id}`,
          icon: "/icon.svg",
        });
        newNotified.push(h.id);
      } catch {
        /* ignore */
      }
    }
  }

  if (newNotified.length !== notified.length) {
    try {
      localStorage.setItem(
        `${NOTIFIED_KEY}-${todayKey}`,
        JSON.stringify(newNotified)
      );
    } catch {
      /* ignore */
    }
  }
  void hhmm;
}
