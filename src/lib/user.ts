import { db } from "./db";
import { DEFAULT_SETTINGS } from "@/constants/settings";
import type { User, UserSettings } from "@/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prismaJson } from "./db-compat";

/**
 * Server-side user helpers.
 *
 * Supports two modes:
 * 1. Authenticated: reads the user ID from the NextAuth session
 * 2. Fallback (demo/guest): uses a single "local-default-user"
 *
 * This allows the app to work without auth (for demo) while supporting
 * real multi-user accounts when users register/login.
 */

const DEFAULT_USER_ID = "local-default-user";

export async function getOrCreateUser(): Promise<{
  id: string;
  name: string;
  xp: number;
  level: number;
  city: string;
  settings: UserSettings;
}> {
  // Try to get the session user first
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? DEFAULT_USER_ID;

  const user = await db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: userId === DEFAULT_USER_ID ? "অতিথি" : (session?.user?.name ?? "ব্যবহারকারী"),
      email: userId === DEFAULT_USER_ID ? undefined : (session?.user?.email ?? undefined),
      city: "ঢাকা",
      settings: prismaJson(DEFAULT_SETTINGS),
    },
  });
  return {
    id: user.id,
    name: user.name,
    xp: user.xp,
    level: user.level,
    city: user.city,
    settings: typeof user.settings === "string" ? parseSettings(user.settings) : { ...DEFAULT_SETTINGS, ...(user.settings as object) },
  };
}

export async function updateUser(
  patch: Partial<Pick<User, "name" | "xp" | "level" | "city">> & {
    settings?: Partial<UserSettings>;
  }
) {
  const current = await getOrCreateUser();
  const mergedSettings = patch.settings
    ? { ...current.settings, ...patch.settings }
    : current.settings;

  return db.user.update({
    where: { id: current.id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.xp !== undefined ? { xp: patch.xp } : {}),
      ...(patch.level !== undefined ? { level: patch.level } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      settings: prismaJson(mergedSettings),
    },
  });
}

export function parseSettings(raw: string | null | undefined): UserSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
