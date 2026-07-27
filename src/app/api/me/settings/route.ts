import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUser } from "@/lib/user";
import type { UserSettings } from "@/types";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(6)]).optional(),
  haptics: z.boolean().optional(),
  sound: z.boolean().optional(),
  remindersEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});

/** POST /api/me/settings — persist user settings */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ সেটিংস", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await updateUser({ settings: parsed.data as Partial<UserSettings> });
  return NextResponse.json({ ok: true });
}
