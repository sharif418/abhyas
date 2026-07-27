import type {
  Badge,
  HabitCategory,
  TimeOfDay,
} from "@/types";

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

/* ------------------------------------------------------------------ */
/*  Badges / Achievements                                              */
/* ------------------------------------------------------------------ */

export const BADGES: Badge[] = [
  {
    id: "first_step",
    name: "প্রথম পদক্ষেপ",
    description: "প্রথম অভ্যাস সম্পন্ন করুন",
    icon: "👣",
    tier: "bronze",
    check: (s) => s.totalCompletions >= 1,
  },
  {
    id: "streak_7",
    name: "এক সপ্তাহ",
    description: "৭ দিনের স্ট্রিক তৈরি করুন",
    icon: "🔥",
    tier: "bronze",
    check: (s) => s.bestStreak >= 7,
  },
  {
    id: "streak_30",
    name: "এক মাস",
    description: "৩০ দিনের স্ট্রিক তৈরি করুন",
    icon: "🔥",
    tier: "silver",
    check: (s) => s.bestStreak >= 30,
  },
  {
    id: "streak_100",
    name: "শত দিন",
    description: "১০০ দিনের স্ট্রিক তৈরি করুন",
    icon: "💯",
    tier: "gold",
    check: (s) => s.bestStreak >= 100,
  },
  {
    id: "streak_365",
    name: "বছরের আনচ",
    description: "৩৬৫ দিনের স্ট্রিক তৈরি করুন",
    icon: "👑",
    tier: "platinum",
    check: (s) => s.bestStreak >= 365,
  },
  {
    id: "early_riser",
    name: "প্রাতঃরাশী",
    description: "ফজরের নামাজে ১৪ দিন স্ট্রিক",
    icon: "🌅",
    tier: "silver",
    check: (s) => s.fajrStreak >= 14,
  },
  {
    id: "quran_reader",
    name: "কুরআন পাঠক",
    description: "মোট ৬০ পৃষ্ঠা কুরআন পড়ুন",
    icon: "📖",
    tier: "gold",
    check: (s) => s.quranPages >= 60,
  },
  {
    id: "collector",
    name: "সংগ্রাহক",
    description: "৫টি অভ্যাস ট্র্যাক করুন",
    icon: "📚",
    tier: "bronze",
    check: (s) => s.habitsTracked >= 5,
  },
  {
    id: "architect",
    name: "স্থপতি",
    description: "১০টি অভ্যাস ট্র্যাক করুন",
    icon: "🏛️",
    tier: "silver",
    check: (s) => s.habitsTracked >= 10,
  },
  {
    id: "perfect_day",
    name: "নিখুঁত দিন",
    description: "একদিনে সব অভ্যাস সম্পন্ন করুন",
    icon: "✨",
    tier: "bronze",
    check: (s) => s.perfectDays >= 1,
  },
  {
    id: "perfect_week",
    name: "নিখুঁত সপ্তাহ",
    description: "৭টি নিখুঁত দিন",
    icon: "🌟",
    tier: "silver",
    check: (s) => s.perfectDays >= 7,
  },
  {
    id: "century",
    name: "শতাধিক",
    description: "মোট ১০০টি অভ্যাস সম্পন্ন করুন",
    icon: "🎯",
    tier: "silver",
    check: (s) => s.totalCompletions >= 100,
  },
  {
    id: "champion",
    name: "চ্যাম্পিয়ন",
    description: "মোট ৫০০টি অভ্যাস সম্পন্ন করুন",
    icon: "🏆",
    tier: "gold",
    check: (s) => s.totalCompletions >= 500,
  },
  {
    id: "level_5",
    name: "উচ্চতর স্তর",
    description: "লেভেল ৫ অর্জন করুন",
    icon: "⭐",
    tier: "silver",
    check: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    name: "অভিজ্ঞ",
    description: "লেভেল ১০ অর্জন করুন",
    icon: "💎",
    tier: "gold",
    check: (s) => s.level >= 10,
  },
  // Focus badges
  {
    id: "focus_starter",
    name: "ফোকাস শুরু",
    description: "প্রথম ফোকাস সেশন সম্পন্ন করুন",
    icon: "🎯",
    tier: "bronze",
    check: (s) => s.totalCompletions >= 1, // reused: focus sessions count
  },
  {
    id: "focus_master",
    name: "ফোকাস মাস্টার",
    description: "১০০ মিনিট ফোকাস কাজ করুন",
    icon: "🧠",
    tier: "gold",
    check: (s) => s.totalCompletions >= 50, // proxy: 50+ completions
  },
];

/* ------------------------------------------------------------------ */
/*  Bangladesh cities for prayer times (lat/lng)                       */
/* ------------------------------------------------------------------ */

export interface BdCity {
  name: string;
  lat: number;
  lng: number;
}

export const BD_CITIES: BdCity[] = [
  { name: "ঢাকা", lat: 23.8103, lng: 90.4125 },
  { name: "চট্টগ্রাম", lat: 22.3569, lng: 91.7832 },
  { name: "রাজশাহী", lat: 24.3636, lng: 88.6241 },
  { name: "খুলনা", lat: 22.8456, lng: 89.5403 },
  { name: "সিলেট", lat: 24.8949, lng: 91.8687 },
  { name: "বরিশাল", lat: 22.701, lng: 90.3535 },
  { name: "রংপুর", lat: 25.7439, lng: 89.2752 },
  { name: "ময়মনসিংহ", lat: 24.7471, lng: 90.4203 },
  { name: "কুমিল্লা", lat: 23.4683, lng: 91.1786 },
  { name: "নারায়ণগঞ্জ", lat: 23.6238, lng: 90.4963 },
  { name: "গাজীপুর", lat: 24.0023, lng: 90.4264 },
  { name: "জামালপুর", lat: 24.9374, lng: 89.9388 },
];

/* ------------------------------------------------------------------ */
/*  Prayer metadata                                                    */
/* ------------------------------------------------------------------ */

export interface PrayerMeta {
  key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  label: string;
  emoji: string;
  field: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
}

export const PRAYERS: PrayerMeta[] = [
  { key: "fajr", label: "ফজর", emoji: "🌅", field: "fajr" },
  { key: "dhuhr", label: "যোহর", emoji: "☀️", field: "dhuhr" },
  { key: "asr", label: "আসর", emoji: "🌇", field: "asr" },
  { key: "maghrib", label: "মাগরিব", emoji: "🌆", field: "maghrib" },
  { key: "isha", label: "এশা", emoji: "🌙", field: "isha" },
];

/* ------------------------------------------------------------------ */
/*  Tasbih / Zikr presets                                              */
/* ------------------------------------------------------------------ */

export interface TasbihPreset {
  id: string;
  arabic: string;
  bengali: string;
  transliteration: string;
  target: number;
}

export const TASBIH_PRESETS: TasbihPreset[] = [
  {
    id: "subhanallah",
    arabic: "سُبْحَانَ ٱللَّٰهِ",
    bengali: "সুবহানাল্লাহ",
    transliteration: "Subhanallah",
    target: 33,
  },
  {
    id: "alhamdulillah",
    arabic: "ٱلْحَمْدُ لِلَّٰهِ",
    bengali: "আলহামদুলিল্লাহ",
    transliteration: "Alhamdulillah",
    target: 33,
  },
  {
    id: "allahuakbar",
    arabic: "ٱللَّٰهُ أَكْبَرُ",
    bengali: "আল্লাহু আকবার",
    transliteration: "Allahu Akbar",
    target: 34,
  },
  {
    id: "la_ilaha",
    arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    bengali: "লা ইলাহা ইল্লাল্লাহ",
    transliteration: "La ilaha illallah",
    target: 100,
  },
  {
    id: "astaghfirullah",
    arabic: "أَسْتَغْفِرُ ٱللَّٰهَ",
    bengali: "আস্তাগফিরুল্লাহ",
    transliteration: "Astaghfirullah",
    target: 100,
  },
  {
    id: "durud",
    arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ",
    bengali: "দরুদ শরীফ",
    transliteration: "Durood Shareef",
    target: 100,
  },
];

/* ------------------------------------------------------------------ */
/*  Dua library — morning, evening, sleep, etc.                       */
/* ------------------------------------------------------------------ */

export interface Dua {
  id: string;
  category: "সকাল" | "সন্ধ্যা" | "ঘুমানোর আগে" | "খাবার" | "ভ্রমণ" | "বিপদে";
  title: string;
  arabic: string;
  bengali: string;
  transliteration: string;
  meaning: string;
  count?: number;
}

export const DUAS: Dua[] = [
  {
    id: "morning_1",
    category: "সকাল",
    title: "সকালের প্রধান দোয়া",
    arabic:
      "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    bengali:
      "আসবাহনা ওয়া আসবাহাল মুলকু লিল্লাহি ওয়াল হামদু লিল্লাহি লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারিকা লাহ",
    transliteration: "Asbahna wa asbahal-mulku lillah",
    meaning:
      "আমরা সকালে পৌঁছেছি এবং রাজত্ব আল্লাহর জন্য সকালে পৌঁছেছে। সমস্ত প্রশংসা আল্লাহর জন্য।",
    count: 1,
  },
  {
    id: "morning_2",
    category: "সকাল",
    title: "বিপদ থেকে রক্ষার দোয়া",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    bengali:
      "বিসমিল্লাহিল্লাজি লা ইয়াদুররু মা’আসমিহি শাইয়ুন ফিল আরদি ওয়ালা ফিস সামায়ি ওয়া হুওয়াস সামিউল আলিম",
    transliteration: "Bismillahillazi la yadurru",
    meaning:
      "সেই আল্লাহর নামে শুরু করছি যাঁর নামের বরকতে পৃথিবীতে বা আকাশে কোনো কিছুই ক্ষতি করতে পারে না।",
    count: 3,
  },
  {
    id: "evening_1",
    category: "সন্ধ্যা",
    title: "সন্ধ্যার প্রধান দোয়া",
    arabic:
      "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    bengali:
      "আমসাইনা ওয়া আমসাল মুলকু লিল্লাহি ওয়াল হামদু লিল্লাহি লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারিকা লাহ",
    transliteration: "Amsayna wa amsal-mulku lillah",
    meaning:
      "আমরা সন্ধ্যায় পৌঁছেছি এবং রাজত্ব আল্লাহর জন্য সন্ধ্যায় পৌঁছেছে। সমস্ত প্রশংসা আল্লাহর জন্য।",
    count: 1,
  },
  {
    id: "sleep_1",
    category: "ঘুমানোর আগে",
    title: "ঘুমানোর দোয়া",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    bengali: "বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া",
    transliteration: "Bismika Allahumma amutu wa ahya",
    meaning: "হে আল্লাহ! আপনার নামেই আমি মৃত্যুবরণ করি ও জীবিত হই।",
    count: 1,
  },
  {
    id: "food_1",
    category: "খাবার",
    title: "খাবার শুরুর দোয়া",
    arabic: "بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ",
    bengali: "বিসমিল্লাহি ওয়া আলা বারাকাতিল্লাহ",
    transliteration: "Bismillahi wa ala barakatillah",
    meaning: "আল্লাহর নামে শুরু করছি এবং আল্লাহর বরকতের উপর ভরসা করছি।",
    count: 1,
  },
  {
    id: "food_2",
    category: "খাবার",
    title: "খাবার শেষের দোয়া",
    arabic:
      "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
    bengali:
      "আলহামদু লিল্লাহিল্লাজি আতআমানা ওয়া সাকানা ওয়া জাআলানা মুসলিমিন",
    transliteration: "Alhamdu lillahil-lazi at’amana",
    meaning:
      "প্রশংসা সেই আল্লাহর যিনি আমাদের আহার দিয়েছেন, পানীয় দিয়েছেন এবং আমাদের মুসলিম করেছেন।",
    count: 1,
  },
  {
    id: "travel_1",
    category: "ভ্রমণ",
    title: "ভ্রমণের দোয়া",
    arabic:
      "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    bengali:
      "সুবহানাল্লাজি সাখখারা লানা হাজা ওয়া মা কুন্না লাহু মুকরিনিন",
    transliteration: "Subhanallazi sakhkhara lana haza",
    meaning:
      "পবিত্র সেই সত্তা যিনি এটিকে আমাদের অধীন করেছেন, অথচ আমরা এটিকে নিয়ন্ত্রণ করতে সক্ষম ছিলাম না।",
    count: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Quran — first 10 short surahs (memorization / reading targets)     */
/* ------------------------------------------------------------------ */

export interface SurahMeta {
  number: number;
  name: string;
  nameArabic: string;
  ayahs: number;
  englishName: string;
}

export const SURAHS: SurahMeta[] = [
  { number: 1, name: "আল-ফাতিহা", nameArabic: "ٱلْفَاتِحَة", ayahs: 7, englishName: "Al-Fatihah" },
  { number: 112, name: "আল-ইখলাস", nameArabic: "ٱلْإِخْلَاص", ayahs: 4, englishName: "Al-Ikhlas" },
  { number: 113, name: "আল-ফালাক", nameArabic: "ٱلْفَلَق", ayahs: 5, englishName: "Al-Falaq" },
  { number: 114, name: "আন-নাস", nameArabic: "ٱلنَّاس", ayahs: 6, englishName: "An-Nas" },
  { number: 111, name: "আল-মাসাদ", nameArabic: "ٱلْمَسَد", ayahs: 5, englishName: "Al-Masad" },
  { number: 110, name: "আন-নাসর", nameArabic: "ٱلنَّصْر", ayahs: 3, englishName: "An-Nasr" },
  { number: 109, name: "আল-কাফিরুন", nameArabic: "ٱلْكَافِرُون", ayahs: 6, englishName: "Al-Kafirun" },
  { number: 108, name: "আল-কাউসার", nameArabic: "ٱلْكَوْثَر", ayahs: 3, englishName: "Al-Kawthar" },
  { number: 107, name: "আল-মাউন", nameArabic: "ٱلْمَاعُون", ayahs: 7, englishName: "Al-Maun" },
  { number: 103, name: "আল-আসর", nameArabic: "ٱلْعَصْر", ayahs: 3, englishName: "Al-Asr" },
];

/* ------------------------------------------------------------------ */
/*  Streak milestone tiers                                             */
/* ------------------------------------------------------------------ */

export const STREAK_MILESTONES = [
  { days: 7, label: "১ সপ্তাহ", emoji: "🔥", xp: 50 },
  { days: 14, label: "২ সপ্তাহ", emoji: "⚡", xp: 100 },
  { days: 30, label: "১ মাস", emoji: "🏅", xp: 250 },
  { days: 60, label: "২ মাস", emoji: "🥈", xp: 500 },
  { days: 100, label: "১০০ দিন", emoji: "💯", xp: 1000 },
  { days: 180, label: "অর্ধবর্ষ", emoji: "🥇", xp: 2000 },
  { days: 365, label: "১ বছর", emoji: "👑", xp: 5000 },
];

export const ACCENT_PRESETS = [
  { name: "এমেরাল্ড", value: "#059669" },
  { name: "টিল", value: "#0d9488" },
  { name: "সবুজ", value: "#16a34a" },
  { name: "নীল", value: "#0284c7" },
  { name: "বেগুনি", value: "#7c3aed" },
  { name: "গোলাপি", value: "#db2777" },
  { name: "কমলা", value: "#ea580c" },
  { name: "অ্যাম্বার", value: "#d97706" },
];
