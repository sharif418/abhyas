import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/constants/settings";
import { serializeJson } from "@/lib/db-compat";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
  city: z.string().max(60).default("ঢাকা"),
});

/** POST /api/auth/register — create a new user account */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "অবৈধ ইনপুট", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, city } = parsed.data;

  // Check if email already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      city,
      settings: serializeJson(DEFAULT_SETTINGS) as any,
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}
