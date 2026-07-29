/**
 * অভ্যাস — Web Push API client helpers (VAPID).
 *
 * VAPID (Voluntary Application Server Identification) lets our Next.js
 * API routes send push messages to a subscriber's browser without a
 * third-party push service. The PUBLIC key is safe to expose to the
 * client; the PRIVATE key stays on the server (`src/lib/push-server.ts`).
 *
 * This module is **client-safe** — it does NOT import `web-push` (which
 * relies on Node `crypto`). Server-only helpers live in
 * `src/lib/push-server.ts`.
 *
 * Lifecycle:
 *   1. `isPushSupported()`     — feature-detect (SW + PushManager + secure context)
 *   2. `subscribePush()`       — request permission, subscribe via SW, POST to server
 *   3. `getPushSubscription()` — read existing subscription (for status display)
 *   4. `unsubscribePush()`     — unsubscribe + notify server
 */

export type PushPermissionState = "granted" | "denied" | "default" | "unsupported";

/** Shape of a `PushSubscription.toJSON()` — what we POST to the server. */
export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/** Bengali label for each permission state — used by the Profile UI. */
export const PUSH_PERMISSION_LABEL: Record<PushPermissionState, string> = {
  granted: "অনুমতি দেওয়া হয়েছে",
  denied: "অস্বীকার করা হয়েছে",
  default: "অনুমতি প্রয়োজন",
  unsupported: "সমর্থিত নয়",
};

/**
 * Convert a Base64URL string (the VAPID public key) into a Uint8Array.
 * Required by `PushManager.subscribe({ applicationServerKey })`.
 *
 * Handles padding + URL-safe char swap (- → +, _ → /).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  // `atob` is available in browsers + Node 16+. The Buffer fallback is a
  // safety net for unusual runtimes (e.g. edge preview) — never reached
  // in normal browser execution.
  const rawData =
    typeof atob === "function"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");

  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Feature-detect Web Push support.
 *
 * Push requires all of:
 *  - `serviceWorker` in navigator
 *  - `PushManager` on window
 *  - `Notification` API
 *  - A secure context (HTTPS, or localhost/127.0.0.1 for dev)
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  // Secure context: HTTPS or localhost (treated as secure by browsers).
  return (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

/** Current Notification permission state. */
export function getPushPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  // Notification.permission is "granted" | "denied" | "default"
  return Notification.permission as PushPermissionState;
}

/** Fetch the VAPID public key from the server (Base64URL string). */
export async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-public");
  if (!res.ok) {
    throw new Error(`VAPID public key fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { publicKey?: string; configured?: boolean };
  if (!data.publicKey) {
    throw new Error("VAPID public key not configured on server");
  }
  return data.publicKey;
}

/**
 * Get the current `PushSubscription` (if any) from the active SW
 * registration. Returns null if not subscribed or if SW is not ready.
 *
 * Includes a 3s timeout — `navigator.serviceWorker.ready` never resolves
 * if no SW is registered (e.g. Next.js dev mode skips SW registration).
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Request notification permission, subscribe to push using the server's
 * VAPID public key, and POST the subscription to `/api/push/subscribe`.
 *
 * Returns the new subscription, or null if permission was denied.
 * Throws on unsupported browser or unexpected SW failure.
 */
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error("পুশ নোটিফিকেশন এই ব্রাউজারে সমর্থিত নয়");
  }

  // Already subscribed? Re-send to server (idempotent) and return.
  const existing = await getPushSubscription();
  if (existing) {
    await sendSubscriptionToServer(existing);
    return existing;
  }

  // Request permission (must be triggered by user gesture — switch click).
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return null;
  }

  const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
  const vapidPublicKey = await fetchVapidPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true, // required by spec — every push shows a notification
    // Cast: TS 5.7+ widens `Uint8Array` to `Uint8Array<ArrayBufferLike>`,
    // but `PushManager.subscribe` only accepts `BufferSource` (backed by
    // ArrayBuffer). At runtime our Uint8Array IS backed by an ArrayBuffer,
    // so the cast is sound.
    applicationServerKey: applicationServerKey as unknown as BufferSource,
  });

  await sendSubscriptionToServer(subscription);
  return subscription;
}

/**
 * Unsubscribe from push and notify the server (so it stops sending).
 * Returns true on success (or if there was no subscription to remove).
 */
export async function unsubscribePush(): Promise<boolean> {
  const sub = await getPushSubscription();
  if (!sub) return true;
  const ok = await sub.unsubscribe();
  if (ok) {
    // Best-effort server notification — don't block on failure.
    await notifyServerUnsubscribe(sub.endpoint).catch(() => {});
  }
  return ok;
}

// ---- internal helpers ----

function serializeSubscription(sub: PushSubscription): PushSubscriptionPayload {
  const json = sub.toJSON() as Partial<PushSubscriptionPayload>;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid PushSubscription shape");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

async function sendSubscriptionToServer(sub: PushSubscription): Promise<void> {
  const payload = serializeSubscription(sub);
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function notifyServerUnsubscribe(endpoint: string): Promise<void> {
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

/** Race a promise against a timeout — rejects with `Error` on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Service Worker not ready — try production HTTPS")),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
