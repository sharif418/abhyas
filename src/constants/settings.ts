import type { UserSettings } from "@/types";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  accent: "#059669",
  weekStartsOn: 6, // Saturday (Bangladesh week)
  haptics: true,
  sound: true,
  remindersEnabled: true,
  notificationsEnabled: true,
};
