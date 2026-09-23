/**
 * অভ্যাস (Abhyas) — Push Notification Scheduler (Cron Worker)
 *
 * A standalone background service that periodically sends Web Push
 * notifications for the habit system. Three escalating levels:
 *
 *   L1 (index.ts)        — exact reminderTime match: "সময় হয়েছে"
 *   L2 (escalation.ts)   — +90 min still open: "এখনো বাকি আছে" (streak-aware)
 *   L3 (escalation.ts)   — 20:30 / 22:30 consolidated streak rescue
 *
 * All levels are schedule-aware (off-day habits stay silent) and respect
 * the user's notification settings (missing keys = ON, opt-out model).
 *
 * ----------------------------------------------------------------------------
 * Environment variables
 * ----------------------------------------------------------------------------
 *   DATABASE_URL      — PostgreSQL connection string (same as the app)
 *   VAPID_PUBLIC_KEY  — Web Push VAPID public key
 *   VAPID_PRIVATE_KEY — Web Push VAPID private key
 *   VAPID_SUBJECT     — mailto: or https: URL identifying the sender
 *   TZ                — Must be "Asia/Dhaka" (set by Docker)
 *
 * ----------------------------------------------------------------------------
 * Running
 * ----------------------------------------------------------------------------
 *   bun run dev   — hot-reload dev mode     (local: SQLite via .env)
 *   bun index.ts  — production mode         (PostgreSQL)
 *
 * In production this runs as a separate Docker container alongside the main
 * app (see Dockerfile), sharing DATABASE_URL and the VAPID keys.
 */

import type { PushSubscription } from "@prisma/client";
import {
  db,
  log,
  TZ,
  ensureVapidConfigured,
  getCurrentTimeStr,
  getTodayStr,
  parseUserSettings,
  sendToSubscriptions,
} from "./shared";
import { escalationTick } from "./escalation";

const CHECK_INTERVAL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// L1 — exact reminder-time notification
// ---------------------------------------------------------------------------
interface ReminderResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Find habits whose reminderTime matches the current minute, check that
 * they're not done today, and send the "সময় হয়েছে" push.
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
      user: {
        select: { settings: true },
      },
    },
  });

  result.checked = habits.length;
  if (habits.length === 0) return result;

  log(`L1: ${habits.length} habit(s) with reminder at ${currentTime}.`);

  for (const habit of habits) {
    // Skip if already completed today
    if (habit.completions.length > 0) {
      result.skipped++;
      continue;
    }

    // Respect the user's notification opt-outs (missing keys = ON).
    const settings = parseUserSettings(habit.user.settings);
    if (settings.remindersEnabled === false || settings.notificationsEnabled === false) {
      result.skipped++;
      continue;
    }

    // Fetch the user's push subscriptions
    const subscriptions: PushSubscription[] = await db.pushSubscription.findMany({
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

    const res = await sendToSubscriptions(subscriptions, payload, 60 * 60, "normal");
    result.sent += res.sent;
    result.failed += res.failed;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  log("Starting অভ্যাস Push Notification Scheduler (L1 + smart L2/L3)...");
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
    const escalation = await escalationTick();

    const anyActivity =
      result.checked > 0 || escalation.l2Sent > 0 || escalation.rescueSent > 0;
    if (anyActivity) {
      log(
        `Tick: L1 ${result.checked} checked/${result.sent} sent/` +
          `${result.skipped} skipped, L2 ${escalation.l2Sent} sent, ` +
          `L3 ${escalation.rescueSent} sent.`
      );
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
