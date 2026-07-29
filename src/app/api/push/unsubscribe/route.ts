import { NextResponse } from "next/server";
import { z } from "zod";
import { pushSubscriptionStore } from "@/lib/push-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UnsubscribeSchema = z.object({
  endpoint: z.string().min(1),
});

/**
 * POST /api/push/unsubscribe
 *
 * Removes a `PushSubscription` from the server's store. Called by the
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

  pushSubscriptionStore.remove(parsed.data.endpoint);

  return NextResponse.json({ ok: true });
}
