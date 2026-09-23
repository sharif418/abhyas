"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useHabits } from "@/hooks/use-habits";
import { toBn, todayKey } from "@/lib/date-bn";
import type { HabitWithMeta } from "@/types";

/**
 * useNotifications — wires the settings toggles to the browser Notification API.
 *
 * Three escalating levels (Bengali, encouraging — never shaming):
 *
 *  L1 — নম্র মনে করানো (existing): fires at a habit's reminderTime
 *       (within a 15-minute window), once per habit per day.
 *  L2 — অন্তর্দৃষ্টি (smart): if the habit is STILL incomplete 90 minutes
 *       after its reminderTime, one gentle nagain with streak context.
 *  L3 — স্ট্রিক রক্ষা (smart): consolidated evening rescue — a single
 *       notification listing what's still open, at 20:30 and 22:30.
 *
 * Tags match the server push-scheduler (`habit-{id}-{date}-l2`,
 * `rescue-{date}-evening|final`) so OS-level dedup collapses the pair
 * when the app is open while a Web Push arrives.
 *
 * "Perfect day" + streak-break warnings remain in-app (toggle hook).
 */
export function useNotifications() {
  const enabled = useSettingsStore((s) => s.notificationsEnabled);
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const smartReminders = useSettingsStore((s) => s.smartRemindersEnabled);
  const { data: habits } = useHabits();

  // request permission when enabled flips on
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);

  // one-time sweep: drop dedup keys older than yesterday (bounded storage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const stale: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("abhyas-notified-") && !k.includes(yesterday) && !k.includes(todayKey())) {
          stale.push(k);
        }
      }
      for (const k of stale) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }, []);

  // periodic reminder check
  useEffect(() => {
    if (!enabled || !remindersEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!habits || habits.length === 0) return;

    const check = () => checkReminders(habits, smartReminders);
    // check every 15 minutes
    const id = setInterval(check, 15 * 60 * 1000);
    // also check shortly after mount
    const initial = setTimeout(check, 5000);
    return () => {
      clearInterval(id);
      clearTimeout(initial);
    };
  }, [enabled, remindersEnabled, smartReminders, habits]);
}

/** Minutes since midnight for an "HH:MM" string. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Load (or init) the per-day dedup set for a given level suffix. */
function loadNotified(day: string, suffix: string): string[] {
  try {
    const raw = localStorage.getItem(`abhyas-notified-${day}-${suffix}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveNotified(day: string, suffix: string, ids: string[]): void {
  try {
    localStorage.setItem(`abhyas-notified-${day}-${suffix}`, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Fire a local notification (best-effort, never throws). */
function notify(title: string, body: string, tag: string): void {
  try {
    new Notification(title, { body, tag, icon: "/icon.svg" });
  } catch {
    /* ignore */
  }
}

function checkReminders(habits: HabitWithMeta[], smartReminders: boolean) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const day = todayKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  checkLevel1(habits, day, nowMin);
  if (smartReminders) {
    checkLevel2(habits, day, nowMin);
    checkLevel3(habits, day, nowMin);
  }
}

// ---------------------------------------------------------------------------
// L1 — reminder-time notification (unchanged behavior)
// ---------------------------------------------------------------------------
function checkLevel1(habits: HabitWithMeta[], day: string, nowMin: number) {
  const notified = loadNotified(day, "l1");
  const next = [...notified];

  for (const h of habits) {
    if (h.completedToday) continue;
    if (!h.reminderTime) continue;
    if (notified.includes(h.id)) continue;

    const reminderMin = toMinutes(h.reminderTime);
    if (nowMin >= reminderMin && nowMin - reminderMin <= 15) {
      notify(`⏰ ${h.name}`, `এটি সম্পন্ন করার সময় হয়েছে। স্ট্রিক: ${toBn(h.streak)} দিন`, `habit-${h.id}`);
      next.push(h.id);
    }
  }

  if (next.length !== notified.length) saveNotified(day, "l1", next);
}

// ---------------------------------------------------------------------------
// L2 — +90-minute gentle insight ("এখনো বাকি আছে")
// ---------------------------------------------------------------------------
const L2_DELAY_MIN = 90;

function checkLevel2(habits: HabitWithMeta[], day: string, nowMin: number) {
  const notified = loadNotified(day, "l2");
  const next = [...notified];

  for (const h of habits) {
    if (h.completedToday) continue;
    if (!h.reminderTime) continue;
    if (notified.includes(h.id)) continue;

    const dueAt = toMinutes(h.reminderTime) + L2_DELAY_MIN;
    // Guard: the nudge must land on the same day (no post-midnight roll-over).
    if (dueAt > 23 * 60 + 59) continue;

    if (nowMin >= dueAt && nowMin - dueAt <= 15) {
      const body =
        h.streak >= 2
          ? `${h.name} — ${toBn(h.streak)} দিনের স্ট্রিক ধরে রাখতে এখনই সেরে ফেলুন`
          : `${h.name} — মাত্র কয়েক মিনিট লাগবে, এখনই দিয়ে ফেলুন`;
      notify("এখনো বাকি আছে", body, `habit-${h.id}-${day}-l2`);
      next.push(h.id);
    }
  }

  if (next.length !== notified.length) saveNotified(day, "l2", next);
}

// ---------------------------------------------------------------------------
// L3 — consolidated evening streak rescue (20:30) + final call (22:30)
// ---------------------------------------------------------------------------
const RESCUE_TIMES = [
  { at: 20 * 60 + 30, suffix: "evening", title: "স্ট্রিক রক্ষার সময়" },
  { at: 22 * 60 + 30, suffix: "final", title: "আজকের শেষ সুযোগ" },
] as const;

function checkLevel3(habits: HabitWithMeta[], day: string, nowMin: number) {
  const open = habits.filter((h) => !h.completedToday);
  if (open.length === 0) return;

  for (const slot of RESCUE_TIMES) {
    const notified = loadNotified(day, `rescue-${slot.suffix}`);
    if (notified.includes("sent")) continue;
    if (nowMin < slot.at || nowMin - slot.at > 15) continue;

    const names = open
      .slice(0, 2)
      .map((h) => h.name)
      .join(", ");
    const body =
      slot.suffix === "evening"
        ? `আজ ${toBn(open.length)}টি অভ্যাস এখনো বাকি${names ? ` — ${names}${open.length > 2 ? " ও আরও" : ""}` : ""}`
        : `দিন শেষ হতে চলেছে — ${toBn(open.length)}টি অভ্যাস এখনো সম্পন্ন হয়নি`;

    notify(slot.title, body, `rescue-${day}-${slot.suffix}`);
    saveNotified(day, `rescue-${slot.suffix}`, [...notified, "sent"]);
  }
}
