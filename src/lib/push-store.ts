/**
 * অভ্যাস — In-memory Push Subscription store.
 *
 * ⚠️ DEVELOPMENT SHIM — production should persist to a database.
 *
 * This Map survives Next.js HMR in dev (via `globalThis`), but a fresh
 * server process loses all subscriptions. For production, migrate to a
 * Prisma model — e.g.:
 *
 *   model PushSubscription {
 *     id        String   @id @default(cuid())
 *     userId    String
 *     endpoint  String   @unique
 *     p256dh    String
 *     auth      String
 *     createdAt DateTime @default(now())
 *     updatedAt DateTime @updatedAt
 *   }
 *
 * Then replace `pushSubscriptionStore.add/remove/getAll` with Prisma
 * queries scoped by `userId`.
 */

import type { PushSubscription as WebPushSubscription } from "web-push";

export interface StoredPushSubscription extends WebPushSubscription {
  createdAt: string;
}

interface StoreShape {
  map: Map<string, StoredPushSubscription>;
}

const globalForStore = globalThis as typeof globalThis & {
  __abhyasPushStore?: StoreShape;
};

if (!globalForStore.__abhyasPushStore) {
  globalForStore.__abhyasPushStore = { map: new Map() };
}

const store: StoreShape = globalForStore.__abhyasPushStore;

export const pushSubscriptionStore = {
  /** Add or update a subscription (keyed by endpoint URL). */
  add(sub: WebPushSubscription): void {
    store.map.set(sub.endpoint, {
      ...sub,
      createdAt: new Date().toISOString(),
    });
  },

  /** Remove a subscription by its endpoint URL. */
  remove(endpoint: string): void {
    store.map.delete(endpoint);
  },

  /** Return all stored subscriptions (for broadcast / debugging). */
  getAll(): StoredPushSubscription[] {
    return Array.from(store.map.values());
  },

  /** Current subscription count. */
  count(): number {
    return store.map.size;
  },
};
