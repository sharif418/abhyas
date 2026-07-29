/**
 * অভ্যাস (Abhyas) — Push Notification Scheduler (Cron Worker)
 *
 * A standalone background service that periodically checks for habits
 * with `reminderTime` set and sends Web Push notifications to the
 * habit owner's subscribed devices.
 *
 * ----------------------------------------------------------------------------
 * How it works
 * ----------------------------------------------------------------------------
 * Every 60 seconds, the scheduler:
 *   1. Gets the current time in Asia/Dhaka timezone (HH:MM format)
 *   2. Queries all active habits where `reminderTime` == current HH:MM
 *   3. For each matching habit, checks if it's NOT already completed today
 *   4. If not completed, fetches the user's push subscriptions
 *   5. Sends a push notification with the habit name + Bengali reminder text
 *   6. Deduplicates via a `tag` so duplicate notifications collapse
 *
 * ----------------------------------------------------------------------------
 * Environment variables
 * ----------------------------------------------------------------------------
 *   DATABASE_URL     — PostgreSQL connection string (same as the app)
 *   VAPID_PUBLIC_KEY — Web Push VAPID public key
 *   VAPID_PRIVATE_KEY — Web Push VAPID private key
 *   VAPID_SUBJECT    — mailto: or https: URL identifying the sender
 *   TZ               — Must be "Asia/Dhaka" (set by Docker)
 *
 * ----------------------------------------------------------------------------
 * Running
 * ----------------------------------------------------------------------------
 *   bun run dev     — hot-reload dev mode
 *   bun index.ts    — production mode
 *
 * In production, this runs as a separate Docker container alongside the
 * main app. It shares the same DATABASE_URL and VAPID keys.
 */

import { PrismaClient } from "@prisma/client";
import webPush, { type PushSubscription as WebPushSubscription } from "web-push";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CHECK_INTERVAL_MS = 60_000; // 1 minute
const TZ = "Asia/Dhaka";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@abhyas.app";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// ---------------------------------------------------------------------------
// VAPID setup
// ---------------------------------------------------------------------------
let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    log("WARNING: VAPID keys not set — push notifications will be skipped.");
    log("Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.");
    return;
  }
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  log("VAPID configured successfully.");
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function log(message: string): void {
  const ts = new Date().toLocaleString("sv-SE", { timeZone: TZ });
  console.log(`[${ts}] [push-scheduler] ${message}`);
}

// ---------------------------------------------------------------------------
// Time helpers (timezone-safe)
// ---------------------------------------------------------------------------

/** Returns the current HH:MM string in Asia/Dhaka timezone. */
function getCurrentTimeStr(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(now);
}

/** Returns today's date as YYYY-MM-DD in Asia/Dhaka timezone. */
function getTodayStr(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Core scheduling logic
// ---------------------------------------------------------------------------

interface ReminderResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Main tick: find habits whose reminderTime matches the current time,
 * check if they're not done today, and send push notifications.
 */
async function tick(): Promise<ReminderResult> {
  const currentTime = getCurrentTimeStr();
  const today = getTodayStr();
  const result: ReminderResult = { checked: 0, sent: 0, failed: 0, skipped: 0 };

  // Query all active habits with a reminderTime matching the current HH:MM
  const habits = await db.habit.findMany({
    where: {
      active: true,
      reminderTime: currentTime,
    },
    select: {
      id: true,
      name: true,
      userId: true,
      streak: true,
      isIslamic: true,
      completions: {
        where: { date: today },
        select: { id: true },
        take: 1,
      },
    },
  });

  result.checked = habits.length;
  if (habits.length === 0) return result;

  log(`Found ${habits.length} habit(s) with reminder at ${currentTime}.`);

  for (const habit of habits) {
    // Skip if already completed today
    if (habit.completions.length > 0) {
      result.skipped++;
      continue;
    }

    // Fetch the user's push subscriptions
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: habit.userId },
    });

    if (subscriptions.length === 0) {
      result.skipped++;
      continue;
    }

    // Build the notification payload
    const payload = {
      title: "অভ্যাস রিমাইন্ডার",
      body: habit.isIslamic
        ? `${habit.name} — সময় হয়েছে ইবাদত সম্পন্ন করার`
        : `${habit.name} সম্পন্ন করার সময় হয়েছে`,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: `habit-${habit.id}-${today}`, // collapse duplicates for same habit+day
      data: { url: "/", habitId: habit.id },
    };

    // Send to all of the user's subscribed devices
    for (const sub of subscriptions) {
      const webSub: WebPushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
        expirationTime: sub.expirationTime ?? undefined,
      };

      try {
        await webPush.sendNotification(webSub, JSON.stringify(payload), {
          TTL: 60 * 60, // 1 hour
          urgency: "normal",
          topic: payload.tag,
        });
        result.sent++;
      } catch (err) {
        result.failed++;
        // If the subscription is gone (410 Gone) or invalid (404), remove it
        if (err instanceof webPush.WebPushError) {
          const statusCode = err.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            log(`Removing dead subscription (HTTP ${statusCode}): ${sub.endpoint.slice(0, 60)}...`);
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            log(`Push failed (HTTP ${statusCode}) for habit "${habit.name}": ${err.message}`);
          }
        } else {
          log(`Push error for habit "${habit.name}": ${err instanceof Error ? err.message : "unknown"}`);
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log("Starting অভ্যাস Push Notification Scheduler...");
  log(`Timezone: ${TZ}`);
  log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
  ensureVapidConfigured();

  // Run immediately on startup
  await runTick();

  // Then run on interval
  setInterval(runTick, CHECK_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log(`Received ${signal}, shutting down...`);
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

async function runTick(): Promise<void> {
  try {
    const result = await tick();
    if (result.checked > 0) {
      log(`Tick complete: ${result.checked} checked, ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`);
    }
  } catch (err) {
    log(`Tick error: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error("[push-scheduler] Fatal error:", err);
  process.exit(1);
});
