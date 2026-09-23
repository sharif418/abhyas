"use client";

/**
 * NativeAlarm — the native alarm engine bridge.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Web Push (service worker) only works while a browser/PWA context is alive
 * and online. The Android app needs reminders that:
 *   • fire at the EXACT second (AlarmManager exact alarms — survives Doze),
 *   • keep working offline forever (a Java prayer-times calculator),
 *   • survive reboots (BOOT_COMPLETED receiver re-schedules everything),
 *   • carry action buttons ([✓ সম্পন্ন], [১০ মিনিট পর], …) that queue data
 *     without opening the app,
 *   • can switch the phone's real DND on at prayer time (auto-silence).
 *
 * ── Architecture: "Brain in Web, Muscle in Native" ────────────────────────
 * The web layer OWNS the semantics — which reminders exist, when they fire,
 * the Bengali copy, the user's settings. `use-native-alarms.ts` builds an
 * `AlarmSpec[]` plan and hands it to `syncAlarms()`. The native layer OWNS
 * delivery — exact scheduling, boot persistence, notification actions.
 * After a reboot (or when the app stays closed), the native
 * `PrayerTimesCalc` engine keeps prayer alarms alive on its own.
 *
 * ── Web (browser / PWA) ───────────────────────────────────────────────────
 * No exact alarms exist in browsers — that is an OS boundary, not a missing
 * feature. The web implementation is an honest no-op: PWA users keep the
 * existing stack (in-app notifications + server Web Push for offline
 * delivery), so the two platforms never drift.
 */

import { registerPlugin } from "@capacitor/core";

// ---------------------------------------------------------------------------
// Contract (shared by the Java plugin + web no-op)
// ---------------------------------------------------------------------------

/** Which prayer a spec belongs to (matches PRAYERS keys). */
export type AlarmPrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

/** One scheduled notification — the atom of the alarm plan. */
export interface AlarmSpec {
  /** Stable unique id: `prayer-{key}-{date}` or `habit-{habitId}-{date}`. */
  id: string;
  kind: "prayer" | "habit";
  /** Epoch milliseconds when the alarm must fire. */
  at: number;
  title: string;
  body: string;
  /** Notification channel: prayers ring (HIGH), habits are default. */
  channel: "prayers" | "habits";
  /** Prayer extras — present when kind === "prayer". */
  prayerKey?: AlarmPrayerKey;
  /** The prayer's calendar day (YYYY-MM-DD) for prayer-log actions. */
  prayerDate?: string;
  /** Habit extras — present when kind === "habit". */
  habitId?: string;
  /** The habit's calendar day (YYYY-MM-DD) for completion actions. */
  habitDate?: string;
  /** Current streak — used in the notification body copy. */
  streak?: number;
}

/**
 * Everything the native engine needs to keep PRAYER alarms alive with no
 * app, no network, no webview — for the configured horizon of days.
 */
export interface PrayerAlarmConfig {
  city: string;
  lat: number;
  lng: number;
  /** Minutes BEFORE the prayer time to notify (0 = at the time). */
  offsetMin: number;
  /** Enabled prayer keys (subset of the five). */
  prayers: AlarmPrayerKey[];
  /** Opt-in: enable real DND for N minutes when a prayer time arrives. */
  autoSilence: boolean;
  silenceMinutes: number;
  /** Days ahead to keep alarms scheduled (self-extending). */
  horizonDays: number;
  /**
   * Today's authoritative server times (Aladhan "HH:mm") — the engine uses
   * them for TODAY so the ring matches the app exactly; days beyond today
   * are recomputed offline by the native PrayerTimesCalc.
   */
  todayTimes: {
    date: string;
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  } | null;
}

/** An action the user tapped on a notification while the app was closed. */
export interface PendingAction {
  type: "prayer-done" | "habit-done";
  prayerKey?: AlarmPrayerKey;
  habitId?: string;
  /** YYYY-MM-DD the action belongs to. */
  date?: string;
  /** Epoch ms when the action happened. */
  at: number;
}

export interface AlarmStatus {
  /** False on web / unsupported shells. */
  supported: boolean;
  /** Android 12+: exact-alarm special access granted (auto on 13+). */
  exactAlarms: boolean;
  /** Notifications enabled + (API 33+) POST_NOTIFICATIONS granted. */
  notifications: boolean;
  /** DND policy access granted (needed for prayer auto-silence). */
  dndAccess: boolean;
  /** Queued notification-button actions waiting to sync. */
  pendingActions: number;
}

export interface SyncAlarmsOptions {
  alarms: AlarmSpec[];
  /** null → DISABLE prayer alarms (cancel + clear the stored config). */
  prayerConfig: PrayerAlarmConfig | null;
}

export interface SyncAlarmsResult {
  scheduled: number;
  cancelled: number;
}

/**
 * রাতের বিশ্রাম (bedtime) — scheduled wind-down + honest morning report.
 * Lives in the alarm engine: exact alarms, boot-safe, self-extending,
 * 100% offline. DND needs the same "Do Not Disturb access" the focus
 * button uses; without it the bedtime still reminds, just without silence.
 */
export interface BedtimeConfig {
  enabled: boolean;
  /** Minutes-of-day the wind-down starts (default 23:00 → 1380). */
  startMinutes: number;
  /** Minutes-of-day the quiet window ends (default 06:00 → 360). */
  endMinutes: number;
  /** Total-silence DND during the window (needs DND access). */
  dnd: boolean;
}

export interface BedtimeConfigResult extends BedtimeConfig {
  /** Alarms actually scheduled by the last save (future-only). */
  scheduled?: number;
}

export interface NativeAlarmPlugin {
  getStatus(): Promise<AlarmStatus>;
  /** Opens the system "Alarms & reminders" special access screen (API 31+). */
  requestExactAlarmAccess(): Promise<{ opened: boolean }>;
  /** Runtime POST_NOTIFICATIONS request (API 33+). */
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  /** Replace the whole alarm plan (diffs: cancels removed, adds new). */
  syncAlarms(options: SyncAlarmsOptions): Promise<SyncAlarmsResult>;
  cancelAll(): Promise<{ ok: boolean }>;
  /** Drain the queued notification-button actions (web then applies them). */
  getPendingActions(): Promise<{ actions: PendingAction[] }>;
  /** Fire a harmless test notification in ~seconds (default 20s). */
  testAlarm(options?: { seconds?: number }): Promise<{ ok: boolean; at: number }>;
  /** Persist + (re)arm / cancel the bedtime horizon (রাতের বিশ্রাম). */
  saveBedtimeConfig(options: BedtimeConfig): Promise<BedtimeConfigResult>;
  /** Current bedtime config (defaults when never configured). */
  getBedtimeConfig(): Promise<BedtimeConfigResult>;
}

/** Error codes the Java plugin rejects with. */
export const ERR_EXACT_ALARM_REQUIRED = "EXACT_ALARM_REQUIRED";
export const ERR_UNSUPPORTED = "UNSUPPORTED";

// ---------------------------------------------------------------------------
// Web implementation — honest no-op (PWA keeps in-app + Web Push stacks)
// ---------------------------------------------------------------------------

class NativeAlarmWeb implements NativeAlarmPlugin {
  async getStatus(): Promise<AlarmStatus> {
    return {
      supported: false,
      exactAlarms: false,
      notifications: false,
      dndAccess: false,
      pendingActions: 0,
    };
  }

  async requestExactAlarmAccess(): Promise<{ opened: boolean }> {
    return { opened: false };
  }

  async requestNotificationPermission(): Promise<{ granted: boolean }> {
    // Browsers gate notifications themselves via Notification.requestPermission().
    return { granted: false };
  }

  async syncAlarms(options: SyncAlarmsOptions): Promise<SyncAlarmsResult> {
    // Nothing to schedule natively on the web — the alarm plan's inputs
    // still feed the in-app reminder hook + server Web Push scheduler.
    void options;
    return { scheduled: 0, cancelled: 0 };
  }

  async cancelAll(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async getPendingActions(): Promise<{ actions: PendingAction[] }> {
    return { actions: [] };
  }

  async testAlarm(options?: { seconds?: number }): Promise<{ ok: boolean; at: number }> {
    void options;
    return { ok: false, at: 0 };
  }

  async saveBedtimeConfig(options: BedtimeConfig): Promise<BedtimeConfigResult> {
    // Browsers cannot schedule DND or survive reboots — bedtime is native.
    void options;
    return { ...options, scheduled: 0 };
  }

  async getBedtimeConfig(): Promise<BedtimeConfigResult> {
    return { enabled: false, startMinutes: 23 * 60, endMinutes: 6 * 60, dnd: true, scheduled: 0 };
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const NativeAlarm = registerPlugin<NativeAlarmPlugin>("NativeAlarm", {
  web: () => new NativeAlarmWeb(),
});

// ---------------------------------------------------------------------------
// Action-event listener helper (live delivery while the webview is alive)
// ---------------------------------------------------------------------------

/**
 * Subscribes to live "alarmAction" events (fired when the app is in the
 * foreground and a notification button is pressed). The pending-action
 * QUEUE remains the source of truth — this is just lower latency.
 */
export function addAlarmActionListener(
  handler: (action: PendingAction) => void
): () => void {
  try {
    // registerPlugin proxies add/removeListener at runtime; the narrow cast
    // keeps the public plugin interface free of listener plumbing.
    const plugin = NativeAlarm as unknown as {
      addListener?: (
        eventName: string,
        cb: (event: { action?: PendingAction }) => void
      ) => { remove?: () => void };
    };
    const wrapped = (event: { action?: PendingAction }) => {
      if (event?.action) handler(event.action);
    };
    const handle = plugin.addListener?.("alarmAction", wrapped);
    return () => {
      try {
        handle?.remove?.();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
