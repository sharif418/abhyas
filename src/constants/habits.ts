import type { Frequency, HabitCategory, TimeOfDay } from "@/types";

/* ------------------------------------------------------------------ */
/*  Habit categories with themed colors & lucide icon suggestions      */
/* ------------------------------------------------------------------ */

export interface CategoryMeta {
  name: HabitCategory;
  label: string;
  color: string;
  icon: string; // lucide name
  emoji: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    name: "প্রার্থনা ও ইবাদত",
    label: "প্রার্থনা ও ইবাদত",
    color: "#0d9488",
    icon: "Moon",
    emoji: "🕌",
  },
  {
    name: "স্বাস্থ্য ও ফিটনেস",
    label: "স্বাস্থ্য ও ফিটনেস",
    color: "#059669",
    icon: "Dumbbell",
    emoji: "💪",
  },
  {
    name: "পড়াশোনা ও জ্ঞান",
    label: "পড়াশোনা ও জ্ঞান",
    color: "#0284c7",
    icon: "BookOpen",
    emoji: "📚",
  },
  {
    name: "কাজ ও পেশা",
    label: "কাজ ও পেশা",
    color: "#7c3aed",
    icon: "Briefcase",
    emoji: "💼",
  },
  {
    name: "পরিবার ও সম্পর্ক",
    label: "পরিবার ও সম্পর্ক",
    color: "#db2777",
    icon: "Heart",
    emoji: "👨‍👩‍👧",
  },
  {
    name: "অর্থনীতি ও সঞ্চয়",
    label: "অর্থনীতি ও সঞ্চয়",
    color: "#ca8a04",
    icon: "Wallet",
    emoji: "💰",
  },
  {
    name: "মানসিক সুস্থতা",
    label: "মানসিক সুস্থতা",
    color: "#9333ea",
    icon: "Brain",
    emoji: "🧠",
  },
  {
    name: "জীবনধারা",
    label: "জীবনধারা",
    color: "#ea580c",
    icon: "Sparkles",
    emoji: "✨",
  },
];

export const CATEGORY_MAP: Record<HabitCategory, CategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.name, c])) as Record<
    HabitCategory,
    CategoryMeta
  >;

/* ------------------------------------------------------------------ */
/*  Times of day                                                       */
/* ------------------------------------------------------------------ */

export interface TimeOfDayMeta {
  key: TimeOfDay;
  label: string;
  icon: string; // lucide
  emoji: string;
  gradient: string; // tailwind classes
}

export const TIMES_OF_DAY: TimeOfDayMeta[] = [
  {
    key: "সকাল",
    label: "সকাল",
    icon: "Sunrise",
    emoji: "🌅",
    gradient: "from-amber-400/20 to-orange-300/10",
  },
  {
    key: "দুপুর",
    label: "দুপুর",
    icon: "Sun",
    emoji: "☀️",
    gradient: "from-yellow-400/20 to-amber-300/10",
  },
  {
    key: "বিকাল",
    label: "বিকাল",
    icon: "Sunset",
    emoji: "🌇",
    gradient: "from-orange-400/20 to-rose-300/10",
  },
  {
    key: "রাত",
    label: "রাত",
    icon: "Moon",
    emoji: "🌙",
    gradient: "from-indigo-400/20 to-violet-300/10",
  },
];

/* ------------------------------------------------------------------ */
/*  Habit frequencies (canonical list — mirrors the Frequency union)   */
/* ------------------------------------------------------------------ */

export interface FrequencyMeta {
  value: Frequency;
  label: string;
  hint: string;
}

export const FREQUENCIES: FrequencyMeta[] = [
  { value: "প্রতিদিন", label: "প্রতিদিন", hint: "সপ্তাহের সাত দিনই" },
  { value: "নির্দিষ্ট দিন", label: "নির্দিষ্ট দিন", hint: "সপ্তাহের নির্বাচিত দিনগুলোতে" },
  { value: "সপ্তাহে কয়েকবার", label: "সপ্তাহে কয়েকবার", hint: "সপ্তাহে নির্দিষ্ট সংখ্যক বার" },
  { value: "মাসে একবার", label: "মাসে একবার", hint: "মাসে একবার" },
];

/* ------------------------------------------------------------------ */
/*  Habit color palette (user-selectable accent per habit)             */
/* ------------------------------------------------------------------ */

export const HABIT_COLORS: { name: string; value: string }[] = [
  { name: "এমেরাল্ড", value: "#059669" },
  { name: "টিল", value: "#0d9488" },
  { name: "সবুজ", value: "#16a34a" },
  { name: "নীল", value: "#0284c7" },
  { name: "বেগুনি", value: "#7c3aed" },
  { name: "গোলাপি", value: "#db2777" },
  { name: "কমলা", value: "#ea580c" },
  { name: "অ্যাম্বার", value: "#d97706" },
  { name: "সোনালি", value: "#ca8a04" },
  { name: "লাল", value: "#dc2626" },
  { name: "স্লেট", value: "#475569" },
  { name: "ইন্ডিগো", value: "#4f46e5" },
];

/* ------------------------------------------------------------------ */
/*  Lucide icon options for habit creation                             */
/* ------------------------------------------------------------------ */

export const HABIT_ICONS: string[] = [
  "CheckCircle",
  "Dumbbell",
  "BookOpen",
  "Moon",
  "Sun",
  "Sunrise",
  "Heart",
  "Brain",
  "Droplets",
  "Apple",
  "Footprints",
  "Bike",
  "PenLine",
  "Languages",
  "Wallet",
  "PiggyBank",
  "Briefcase",
  "Laptop",
  "Code",
  "Music",
  "Camera",
  "Palette",
  "Sprout",
  "Leaf",
  "Coffee",
  "BedDouble",
  "Phone",
  "Users",
  "Smile",
  "Gift",
  "Star",
  "Trophy",
  "Flame",
  "Clock",
  "Bell",
  "Target",
];
