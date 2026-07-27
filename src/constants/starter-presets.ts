import type { HabitCategory, TimeOfDay } from "@/types";

/**
 * Curated starter habit presets for the onboarding flow.
 * Users can multi-select which habits to seed on first run.
 */
export interface StarterPreset {
  id: string;
  name: string;
  icon: string;
  category: HabitCategory;
  color: string;
  timeOfDay: TimeOfDay;
  isIslamic: boolean;
  emoji: string;
  desc: string;
}

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: "fajr",
    name: "ফজরের নামাজ",
    icon: "Moon",
    category: "প্রার্থনা ও ইবাদত",
    color: "#0d9488",
    timeOfDay: "সকাল",
    isIslamic: true,
    emoji: "🕌",
    desc: "ভোরে নামাজ পড়ে দিন শুরু",
  },
  {
    id: "quran",
    name: "কুরআন তিলাওয়াত",
    icon: "BookOpen",
    category: "প্রার্থনা ও ইবাদত",
    color: "#059669",
    timeOfDay: "সকাল",
    isIslamic: true,
    emoji: "📖",
    desc: "প্রতিদিন এক পৃষ্ঠা পড়ুন",
  },
  {
    id: "exercise",
    name: "সকালের ব্যায়াম",
    icon: "Dumbbell",
    category: "স্বাস্থ্য ও ফিটনেস",
    color: "#16a34a",
    timeOfDay: "সকাল",
    isIslamic: false,
    emoji: "💪",
    desc: "১৫ মিনিট শারীরিক ব্যায়াম",
  },
  {
    id: "water",
    name: "পানি পান (৮ গ্লাস)",
    icon: "Droplets",
    category: "স্বাস্থ্য ও ফিটনেস",
    color: "#0284c7",
    timeOfDay: "দুপুর",
    isIslamic: false,
    emoji: "💧",
    desc: "প্রতিদিন ৮ গ্লাস পানি",
  },
  {
    id: "study",
    name: "পড়াশোনা",
    icon: "BookOpen",
    category: "পড়াশোনা ও জ্ঞান",
    color: "#7c3aed",
    timeOfDay: "বিকাল",
    isIslamic: false,
    emoji: "📚",
    desc: "প্রতিদিন ১ ঘণ্টা পড়ুন",
  },
  {
    id: "walk",
    name: "হাঁটা / ভ্রমণ",
    icon: "Footprints",
    category: "স্বাস্থ্য ও ফিটনেস",
    color: "#16a34a",
    timeOfDay: "বিকাল",
    isIslamic: false,
    emoji: "🚶",
    desc: "৩০ মিনিট হাঁটুন",
  },
  {
    id: "diary",
    name: "ডায়েরি লেখা",
    icon: "PenLine",
    category: "মানসিক সুস্থতা",
    color: "#9333ea",
    timeOfDay: "রাত",
    isIslamic: false,
    emoji: "✍️",
    desc: "দিনের অভিজ্ঞতা লিখুন",
  },
  {
    id: "sleep_dua",
    name: "ঘুমানোর আগে দোয়া",
    icon: "BedDouble",
    category: "প্রার্থনা ও ইবাদত",
    color: "#0d9488",
    timeOfDay: "রাত",
    isIslamic: true,
    emoji: "🌙",
    desc: "ঘুমানোর পূর্বে দোয়া পড়ুন",
  },
];
