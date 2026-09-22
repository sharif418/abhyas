import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUser } from "@/lib/user";
import type { UserSettings } from "@/types";

export const dynamic = "force-dynamic";

const IbadahSchema = z.object({
  active: z.boolean(),
  /** How long (minutes) notifications stay suppressed after `active: true`. */
  durationMin: z.number().int().min(1).max(480).default(120),
});

/**
 * POST /api/ibadah — ইবাদত মোড notification suppression window.
 *
 * While a user is in ইবাদত মোড (immersive Quran/Zikr session) this endpoint
 * records an `ibadahUntil` epoch-ms timestamp in their settings. The push
 * scheduler reads it before sending ANY push to that user and skips the send
 * while `now < ibadahUntil`, so the user's own habit reminders never
 * interrupt their ইবাদত.
 *
 * `{ active: false }` clears the window immediately.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = IbadahSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ অনুরোধ", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { active, durationMin } = parsed.data;
  const patch: Partial<UserSettings> = active
    ? { ibadahUntil: Date.now() + durationMin * 60_000 }
    : { ibadahUntil: 0 };

  await updateUser({ settings: patch });
  return NextResponse.json({ ok: true, ibadahUntil: patch.ibadahUntil ?? 0 });
}
