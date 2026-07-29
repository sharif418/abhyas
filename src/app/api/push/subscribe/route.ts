import { NextResponse } from "next/server";
import { z } from "zod";
import { pushSubscriptionStore } from "@/lib/push-store";
import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /api/push/subscribe
 *
 * Stores a `PushSubscription` (sent by the browser after a successful
 * `pushManager.subscribe()`). The body is the JSON-serialised form of
 * the browser's `PushSubscription` object.
 *
 * Body:
 *   { endpoint, expirationTime?, keys: { p256dh, auth } }
 *
 * The subscription is persisted to the database (PushSubscription table),
 * keyed by endpoint URL. Survives server restarts.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = SubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ সাবস্ক্রিপশন ডেটা" },
      { status: 400 }
    );
  }

  const user = await getOrCreateUser();
  await pushSubscriptionStore.add(user.id, parsed.data);

  return NextResponse.json({
    ok: true,
    total: await pushSubscriptionStore.count(),
  });
}
