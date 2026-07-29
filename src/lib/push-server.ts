/**
 * অভ্যাস — Server-side Web Push helpers.
 *
 * Wraps the `web-push` npm package to:
 *  - configure VAPID identification (public + private key + subject)
 *  - send push messages to subscribed browsers
 *  - generate fresh VAPID keys (for first-time setup / rotation)
 *
 * VAPID keys are read from environment variables:
 *   - `VAPID_PUBLIC_KEY`   (safe to expose — used by the browser)
 *   - `VAPID_PRIVATE_KEY`  (server-only — never ship to the client)
 *   - `VAPID_SUBJECT`      (mailto: or https: URL identifying the sender)
 *
 * If keys are missing, `isPushConfigured()` returns false and the API
 * routes return 503 — the Profile UI degrades to "অসমর্থিত" gracefully.
 *
 * ---- Generating VAPID keys ----
 *
 *   Option A (CLI, recommended for production):
 *     bunx web-push generate-vapid-keys
 *
 *   Option B (programmatic, for tests):
 *     import { generateVapidKeys } from "@/lib/push-server";
 *     const { publicKey, privateKey } = generateVapidKeys();
 *
 * Store the resulting Base64URL strings in `.env` (never commit real keys).
 */

import webPush, {
  type PushSubscription as WebPushSubscription,
  type RequestOptions,
} from "web-push";

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? "mailto:hello@abhyas.app";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // Soft-fail: callers should check `isPushConfigured()` first.
    return;
  }
  webPush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
}

/** Returns true if both VAPID keys are present in env. */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/** Returns the VAPID public key (Base64URL) or null if not configured. */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

/**
 * Generate a fresh VAPID key pair.
 * Returns Base64URL-encoded { publicKey, privateKey }.
 *
 * One-time setup operation — call from a trusted script, NOT on each
 * request. Persist the output to environment variables.
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webPush.generateVAPIDKeys();
}

/** Bengali-default notification payload sent to the SW `push` handler. */
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to a single subscription.
 *
 * @param subscription  PushSubscription JSON { endpoint, keys }
 * @param payload       Object serialised to JSON (max ~4 KB after encryption)
 * @throws webPush.WebPushError on non-200 response from push service
 */
export async function sendPushNotification(
  subscription: WebPushSubscription,
  payload: PushPayload
): Promise<void> {
  if (!isPushConfigured()) {
    throw new Error("VAPID keys not configured — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
  }
  ensureConfigured();

  const options: RequestOptions = {
    TTL: 60 * 60, // 1 hour — drop the message if undelivered by then
    urgency: "normal",
    topic: payload.tag, // collapse key — replaces prior notif with same tag
  };

  await webPush.sendNotification(
    subscription,
    JSON.stringify(payload),
    options
  );
}

/** Bengali habit-reminder body text used by default push payloads. */
export const HABIT_REMINDER_BODY =
  "আপনার অভ্যাস সম্পন্ন করার সময় হয়েছে";
