/**
 * অভ্যাস — Domain Types
 * Strictly-typed contracts shared across UI, stores, and API.
 */

export type TimeOfDay = "সকাল" | "দুপুর" | "বিকাল" | "রাত";

export type Frequency =
  | "প্রতিদিন"
  | "নির্দিষ্ট দিন"
  | "সপ্তাহে কয়েকবার"
  | "মাসে একবার";

export type HabitCategory =
  | "প্রার্থনা ও ইবাদত"
  | "স্বাস্থ্য ও ফিটনেস"
  | "পড়াশোনা ও জ্ঞান"
  | "কাজ ও পেশা"
  | "পরিবার ও সম্পর্ক"
  | "অর্থনীতি ও সঞ্চয়"
  | "মানসিক সুস্থতা"
  | "জীবনধারা";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  nameEn?: string | null;
  icon: string;
  category: HabitCategory;
  color: string;
  target: string;
  frequency: Frequency;
  frequencyDays: number[]; // 0=Sun .. 6=Sat
  timesPerWeek: number;
  timeOfDay: TimeOfDay;
  reminderTime?: string | null;
  streak: number;
  bestStreak: number;
  totalDone: number;
  sortOrder: number;
  active: boolean;
  isIslamic: boolean;
  frozenDate?: string | null; // YYYY-MM-DD forgiven by a streak freeze
  freezeUsedWeek?: string | null; // ISO week key when freeze was used
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completedAt: string;
  note?: string | null;
}

/** Aggregated habit row with today's completion flag and recent heatmap. */
export interface HabitWithMeta extends Habit {
  completedToday: boolean;
  completedDates: string[]; // last ~370 days of "YYYY-MM-DD"
  completionRate: number; // 0..1 over tracked window
}

export interface PrayerRecord {
  id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  sunnahFajr: boolean;
  sunnahOther: boolean;
  tahajjud: boolean;
}

export interface PrayerTimes {
  date: string;
  city: string;
  lat: number;
  lng: number;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  tomorrowFajr?: string;
}

export interface QuranSession {
  id: string;
  date: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  pagesRead: number;
  juz?: number | null;
}

export interface Achievement {
  id: string;
  badgeId: string;
  earnedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  xp: number;
  level: number;
  city: string;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  accent: string; // hex
  weekStartsOn: 0 | 6; // 0=Sunday, 6=Saturday
  haptics: boolean;
  sound: boolean;
  remindersEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  tier: "bronze" | "silver" | "gold" | "platinum";
  check: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalCompletions: number;
  bestStreak: number;
  currentStreak: number;
  habitsTracked: number;
  perfectDays: number;
  fajrStreak: number;
  quranPages: number;
  fastingDays: number;
  level: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1
}

export type ViewKey =
  | "home"
  | "habits"
  | "stats"
  | "islamic"
  | "social"
  | "profile";

/** Bengali weekday names (0=Sunday … 6=Saturday). */
export const BENGALI_WEEKDAYS = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
] as const;

export const BENGALI_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

export const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
