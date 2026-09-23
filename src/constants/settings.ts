import type { UserSettings } from "@/types";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  accent: "#059669",
  weekStartsOn: 6, // Saturday (Bangladesh week)
  haptics: true,
  sound: true,
  remindersEnabled: true,
  notificationsEnabled: true,
  smartRemindersEnabled: true,
  prayerSilenceEnabled: true,
  // নামাজের ওয়াকত রিমাইন্ডার — default ON (the app's core purpose), all five
  // prayers, ringing exactly at each time. Auto-DND stays opt-in (a phone
  // that silences itself must always be the user's explicit choice).
  prayerAlarmsEnabled: true,
  prayerAlarmOffsetMin: 0,
  prayerAlarmPrayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  prayerAutoSilenceEnabled: false,
};
