import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser, updateUser } from "@/lib/user";

export const dynamic = "force-dynamic";

/** GET /api/me — current local user + settings */
export async function GET() {
  const user = await getOrCreateUser();
  return NextResponse.json({
    id: user.id,
    name: user.name,
    xp: user.xp,
    level: user.level,
    city: user.city,
    settings: user.settings,
  });
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  city: z.string().max(60).optional(),
});

/** PUT /api/me — update profile (name, city) */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  await updateUser(parsed.data);
  return NextResponse.json({ ok: true });
}
