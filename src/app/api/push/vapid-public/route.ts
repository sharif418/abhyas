import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/push/vapid-public
 *
 * Returns the VAPID public key (Base64URL) so the browser can subscribe
 * via `PushManager.subscribe({ applicationServerKey })`.
 *
 * The public key is SAFE to expose to the client — it identifies the
 * application server, but cannot be used to send pushes without the
 * matching private key (server-only).
 *
 * Returns 503 if VAPID keys are not configured in env.
 */
export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error: "VAPID keys not configured",
        configured: false,
      },
      { status: 503 }
    );
  }
  return NextResponse.json(
    {
      publicKey: getVapidPublicKey(),
      configured: true,
    },
    {
      headers: {
        // Public key rarely changes — but allow revalidation so a rotated
        // key is picked up without a hard refresh.
        "Cache-Control": "no-cache",
      },
    }
  );
}
