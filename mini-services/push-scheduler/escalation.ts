/**
 * অভ্যাস Push Scheduler — Smart escalation ticks (Roadmap ফেজ ১-৪).
 *
 *  L2 — "এখনো বাকি আছে": a habit with a reminderTime that is STILL incomplete
 *       90 minutes after that time gets one gentle, streak-aware nudge.
 *       Individual notification, tag habit-{id}-{today}-l2.
 *
 *  L3 — Streak rescue: at 20:30 ("স্ট্রিক রক্ষার সময়") and 22:30 ("আজকের
 *       শেষ সুযোগ") every user with scheduled-but-incomplete habits gets ONE
 *       consolidated notification listing what's still open — never one per
 *       habit. Tags rescue-{userId}-{today}-evening / -final.
 *
 * All levels respect the user's settings (smartRemindersEnabled /
 * remindersEnabled / notificationsEnabled — missing keys mean ON) and the
 * habit's weekly schedule (no nudges on off-days).
 */

import {
  db,
  log,
  getCurrentTimeStr,
  getTodayStr,
  toMinutes,
  fromMinutes,
  toBn,
  smartAllowed,
  isScheduledOn,
  sendToSubscriptions,
} from "./shared";

/** Evening rescue (consolidated) fire times, Asia/Dhaka. */
const RESCUE_EVENING = "20:30";
const RESCUE_FINAL = "22:30";

export interface TickStats {
  l2Sent: number;
  rescueSent: number;
}

/** Run both escalation checks for the current minute. */
export async function escalationTick(): Promise<TickStats> {
  const stats: TickStats = { l2Sent: 0, rescueSent: 0 };
  try {
    stats.l2Sent = await level2Tick();
  } catch (err) {
    log(`L2 tick error: ${err instanceof Error ? err.message : "unknown"}`);
  }
  try {
    stats.rescueSent = await rescueTick();
  } catch (err) {
    log(`Rescue tick error: ${err instanceof Error ? err.message : "unknown"}`);
  }
  return stats;
}

// ---------------------------------------------------------------------------
// L2 — individual "+90 min" nudge
// ---------------------------------------------------------------------------

/** Fire when 90–95 minutes have passed since the reminder time. The 5-minute
 *  catch-up window makes the system self-healing: a scheduler restart never
 *  silently swallows a nudge (Web Push `topic` collapse replaces re-sends, so
 *  the user still sees at most ONE notification). */
const L2_DELAY_MIN = 90;
const L2_GRACE_MIN = 5;

async function level2Tick(): Promise<number> {
  const currentTime = getCurrentTimeStr();
  const today = getTodayStr();

  const nowMin = toMinutes(currentTime);
  if (nowMin < L2_DELAY_MIN + L2_GRACE_MIN) return 0; // window would cross midnight
  const windowStart = fromMinutes(nowMin - L2_DELAY_MIN - L2_GRACE_MIN);
  const windowEnd = fromMinutes(nowMin - L2_DELAY_MIN);

  const habits = await db.habit.findMany({
    where: {
      active: true,
      reminderTime: { gte: windowStart, lte: windowEnd },
      completions: { none: { date: today } },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      streak: true,
      frequency: true,
      frequencyDays: true,
      user: { select: { settings: true } },
    },
  });

  if (habits.length === 0) return 0;
  log(`L2: ${habits.length} habit(s) nudged at +${L2_DELAY_MIN} min (reminders ${windowStart}–${windowEnd}).`);

  let sent = 0;
  for (const habit of habits) {
    if (!isScheduledOn(habit, today)) continue;
    if (!smartAllowed(habit.user.settings)) continue;

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: habit.userId },
    });
    if (subscriptions.length === 0) continue;

    const body =
      habit.streak >= 2
        ? `${habit.name} — ${toBn(habit.streak)} দিনের স্ট্রিক ধরে রাখতে এখনই সেরে ফেলুন`
        : `${habit.name} — মাত্র কয়েক মিনিট লাগবে, এখনই দিয়ে ফেলুন`;

    const res = await sendToSubscriptions(
      subscriptions,
      {
        title: "এখনো বাকি আছে",
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: `habit-${habit.id}-${today}-l2`,
        data: { url: "/" },
      },
      45 * 60 // TTL 45 min — a late nudge is worthless
    );
    sent += res.sent;
  }
  return sent;
}

// ---------------------------------------------------------------------------
// L3 — consolidated evening streak rescue
// ---------------------------------------------------------------------------
async function rescueTick(): Promise<number> {
  const currentTime = getCurrentTimeStr();
  const today = getTodayStr();

  const phase = currentTime === RESCUE_EVENING ? "evening" : currentTime === RESCUE_FINAL ? "final" : null;
  if (!phase) return 0;

  // Users with at least one scheduled-but-incomplete habit today AND a
  // live push subscription. One consolidated notification per user.
  const users = await db.user.findMany({
    where: {
      habits: {
        some: {
          active: true,
          completions: { none: { date: today } },
        },
      },
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      settings: true,
      habits: {
        where: {
          active: true,
          completions: { none: { date: today } },
        },
        select: { name: true, frequency: true, frequencyDays: true },
        orderBy: { sortOrder: "asc" },
      },
      pushSubscriptions: true,
    },
  });

  if (users.length === 0) return 0;
  log(`L3 ${phase}: ${users.length} user(s) with open habits.`);

  let sent = 0;
  for (const user of users) {
    if (!smartAllowed(user.settings)) continue;

    const open = user.habits.filter((h) => isScheduledOn(h, today));
    if (open.length === 0) continue;

    const names = open
      .slice(0, 2)
      .map((h) => h.name)
      .join(", ");
    const more = open.length > 2 ? " ও আরও" : "";

    const payload =
      phase === "evening"
        ? {
            title: "স্ট্রিক রক্ষার সময়",
            body: `আজ ${toBn(open.length)}টি অভ্যাস এখনো বাকি — ${names}${more}`,
          }
        : {
            title: "আজকের শেষ সুযোগ",
            body: `দিন শেষ হতে চলেছে — ${toBn(open.length)}টি অভ্যাস এখনো সম্পন্ন হয়নি`,
          };

    const res = await sendToSubscriptions(
      user.pushSubscriptions,
      {
        ...payload,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: `rescue-${user.id}-${today}-${phase}`,
        data: { url: "/" },
      },
      90 * 60, // TTL 90 min — evening dies before the final call; final dies by midnight
      phase === "final" ? "high" : "normal"
    );
    sent += res.sent;
  }
  return sent;
}
