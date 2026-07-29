/**
 * অভ্যাস — Push Subscription store backed by Prisma (PostgreSQL / SQLite).
 *
 * Replaces the former in-memory Map with persistent database storage.
 * Subscriptions survive server restarts and are shared across instances.
 *
 * Each subscription is keyed by its `endpoint` URL (unique per browser/device).
 * One user can have multiple subscriptions (phone, tablet, desktop).
 */

import { db } from "./db";
import type { PushSubscription as WebPushSubscription } from "web-push";

export interface StoredPushSubscription extends WebPushSubscription {
  userId: string;
  createdAt: string;
}

/** Convert a Prisma PushSubscription row → WebPushSubscription shape. */
function toWebPush(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime: number | null;
  userId: string;
  createdAt: Date;
}): StoredPushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
    expirationTime: row.expirationTime ?? undefined,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

export const pushSubscriptionStore = {
  /**
   * Add or update a subscription (upserted by endpoint URL).
   * If the endpoint already exists, the keys/auth are refreshed.
   */
  async add(userId: string, sub: WebPushSubscription): Promise<void> {
    await db.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        expirationTime: sub.expirationTime ?? null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        expirationTime: sub.expirationTime ?? null,
      },
    });
  },

  /** Remove a subscription by its endpoint URL. */
  async remove(endpoint: string): Promise<void> {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
  },

  /** Return all subscriptions for a specific user. */
  async getByUser(userId: string): Promise<StoredPushSubscription[]> {
    const rows = await db.pushSubscription.findMany({ where: { userId } });
    return rows.map(toWebPush);
  },

  /** Return ALL subscriptions across all users (for broadcast / debugging). */
  async getAll(): Promise<StoredPushSubscription[]> {
    const rows = await db.pushSubscription.findMany();
    return rows.map(toWebPush);
  },

  /** Current total subscription count across all users. */
  async count(): Promise<number> {
    return db.pushSubscription.count();
  },
};
