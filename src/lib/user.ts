import { db } from "./db";
import { DEFAULT_SETTINGS } from "@/constants/settings";
import type { User, UserSettings } from "@/types";

/**
 * Server-side user helpers.
 *
 * The PWA demo operates on a single local "default" user so the experience
 * is instant and auth-free, while the schema remains multi-user ready.
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
  // upsert is race-safe: concurrent requests won't collide on the fixed id.
  const user = await db.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      name: "অতিথি",
      city: "ঢাকা",
      settings: JSON.stringify(DEFAULT_SETTINGS),
    },
  });
  return {
    id: user.id,
    name: user.name,
    xp: user.xp,
    level: user.level,
    city: user.city,
    settings: parseSettings(user.settings),
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
      settings: JSON.stringify(mergedSettings),
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
