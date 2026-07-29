import { NextResponse } from "next/server";
import { z } from "zod";
import { pushSubscriptionStore } from "@/lib/push-store";
import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UnsubscribeSchema = z.object({
  endpoint: z.string().min(1),
});

/**
 * POST /api/push/unsubscribe
 *
 * Removes a `PushSubscription` from the database. Called by the
 * browser after `PushSubscription.unsubscribe()` so the server stops
 * attempting to send pushes to a dead endpoint.
 *
 * Body: `{ endpoint: string }`
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = UnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "endpoint প্রয়োজন" },
      { status: 400 }
    );
  }

  // Remove this endpoint for the current user only (security: don't let
  // a user unsubscribe another user's device).
  const user = await getOrCreateUser();
  const subs = await pushSubscriptionStore.getByUser(user.id);
  const target = subs.find((s) => s.endpoint === parsed.data.endpoint);
  if (target) {
    await pushSubscriptionStore.remove(parsed.data.endpoint);
  }

  return NextResponse.json({ ok: true });
}
