/**
 * অভ্যাস Push Scheduler — shared helpers.
 *
 * Used by index.ts (L1 exact-time reminders) and escalation.ts (L2/L3
 * smart nudges). Kept dependency-free apart from Prisma + web-push.
 */

import { PrismaClient, PushSubscription } from "@prisma/client";
import webPush, { type PushSubscription as WebPushSubscription } from "web-push";

export const TZ = "Asia/Dhaka";

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
export function log(message: string): void {
  const ts = new Date().toLocaleString("sv-SE", { timeZone: TZ });
  console.log(`[${ts}] [push-scheduler] ${message}`);
}

// ---------------------------------------------------------------------------
// VAPID
// ---------------------------------------------------------------------------
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@abhyas.app";

let vapidConfigured = false;

export function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    log("WARNING: VAPID keys not set — push notifications will be skipped.");
    return;
  }
  webPush.setVapidDetails(VAPID_SUBJECT, pub, priv);
  vapidConfigured = true;
  log("VAPID configured successfully.");
}

// ---------------------------------------------------------------------------
// Time helpers (timezone-safe)
// ---------------------------------------------------------------------------

/** Current HH:MM string in Asia/Dhaka. */
export function getCurrentTimeStr(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Today's date as YYYY-MM-DD in Asia/Dhaka. */
export function getTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutes since midnight for "HH:MM". */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Format minutes-since-midnight back to "HH:MM". */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Bengali numerals
// ---------------------------------------------------------------------------
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBn(n: number): string {
  return String(n)
    .split("")
    .map((d) => BN_DIGITS[Number(d)] ?? d)
    .join("");
}

// ---------------------------------------------------------------------------
// User settings (missing keys = default true — opt-out model)
// ---------------------------------------------------------------------------
export interface UserSettingsRow {
  smartRemindersEnabled?: boolean;
  remindersEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export function parseUserSettings(raw: unknown): UserSettingsRow {
  if (raw == null || raw === "") return {};
  try {
    const s = typeof raw === "string" ? JSON.parse(raw) : raw;
    return typeof s === "object" && s !== null ? (s as UserSettingsRow) : {};
  } catch {
    return {};
  }
}

/** Smart escalation (L2/L3) allowed for this user's settings blob. */
export function smartAllowed(raw: unknown): boolean {
  const s = parseUserSettings(raw);
  return (
    s.smartRemindersEnabled !== false &&
    s.remindersEnabled !== false &&
    s.notificationsEnabled !== false
  );
}

// ---------------------------------------------------------------------------
// Schedule awareness (mirrors src/lib/streaks.ts isScheduledOn)
// ---------------------------------------------------------------------------

interface ScheduleShape {
  frequency: string;
  frequencyDays: number[] | string | null;
}

/** True when the habit is scheduled on the given date key (YYYY-MM-DD). */
export function isScheduledOn(habit: ScheduleShape, dateKey: string): boolean {
  let days: number[] = [];
  if (typeof habit.frequencyDays === "string") {
    try {
      days = JSON.parse(habit.frequencyDays);
    } catch {
      days = [];
    }
  } else if (Array.isArray(habit.frequencyDays)) {
    days = habit.frequencyDays;
  }

  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat

  switch (habit.frequency) {
    case "প্রতিদিন":
      return true;
    case "নির্দিষ্ট দিন":
      return days.length === 0 ? true : days.includes(weekday);
    case "সপ্তাহে কয়েকবার":
      return true; // flexible — any day can count
    case "মাসে একবার":
      return d === 1; // first-of-month proxy (same as the app)
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface SendResult {
  sent: number;
  failed: number;
}

const URLSAFE_B64 = /^[A-Za-z0-9_-]+$/;

/**
 * Web Push `topic` (the collapse key) must be ≤32 URL-safe-Base64 chars —
 * web-push THROWS for longer values, which silently killed every send for
 * tags like `habit-{cuid25}-{date}` (42 chars). Long tags are shortened to
 * a deterministic FNV-1a base36 hash with a stable kind prefix; collisions
 * only risk collapsing two notifications into one, same-day scope makes
 * that practically impossible.
 */
export function pushTopic(tag: string | undefined): string | undefined {
  if (!tag) return undefined;
  if (tag.length <= 32 && URLSAFE_B64.test(tag)) return tag;

  let h = 0x811c9dc5;
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const b36 = (h >>> 0).toString(36);
  const kind = tag.split("-", 1)[0].slice(0, 4) || "t";
  return `${kind}-${b36}`;
}

/** Send one payload to a user's subscriptions; prunes dead ones (410/404). */
export async function sendToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload,
  ttlSec: number,
  urgency: "normal" | "high" = "normal"
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0 };

  for (const sub of subscriptions) {
    const webSub: WebPushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
      expirationTime: sub.expirationTime ?? undefined,
    };

    try {
      await webPush.sendNotification(webSub, JSON.stringify(payload), {
        TTL: ttlSec,
        urgency,
        topic: pushTopic(payload.tag),
      });
      result.sent++;
    } catch (err) {
      result.failed++;
      if (err instanceof webPush.WebPushError) {
        const statusCode = err.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          log(`Removing dead subscription (HTTP ${statusCode}): ${sub.endpoint.slice(0, 60)}...`);
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          log(`Push failed (HTTP ${statusCode}): ${err.message}`);
        }
      } else {
        log(`Push error: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  }

  return result;
}
