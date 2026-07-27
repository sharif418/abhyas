import type { HabitCategory, TimeOfDay, Frequency } from "@/types";

/**
 * Curated habit template bundles.
 * Each bundle is a themed collection of habits users can install in one tap.
 */
export interface TemplateHabit {
  name: string;
  icon: string;
  category: HabitCategory;
  color: string;
  timeOfDay: TimeOfDay;
  frequency: Frequency;
  frequencyDays: number[];
  isIslamic: boolean;
}

export interface TemplateBundle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string; // tailwind gradient classes
  habits: TemplateHabit[];
}

export const TEMPLATE_BUNDLES: TemplateBundle[] = [
  {
    id: "ramadan",
    name: "রমজান প্রস্তুতি",
    emoji: "🌙",
    description: "পবিত্র রমজানের জন্য আধ্যাত্মিক প্রস্তুতি",
    gradient: "from-purple-500/20 to-indigo-500/10",
    habits: [
      { name: "সাহরী খাওয়া", icon: "Utensils", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "ফজরের নামাজ (জামাতে)", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "কুরআন তিলাওয়াত (১ পারা)", icon: "BookOpen", category: "প্রার্থনা ও ইবাদত", color: "#059669", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "তারাবীহ নামাজ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "ইফতার পরিবেশন", icon: "Heart", category: "প্রার্থনা ও ইবাদত", color: "#db2777", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "তাহাজ্জুদ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
    ],
  },
  {
    id: "student",
    name: "ছাত্র রুটিন",
    emoji: "📚",
    description: "পড়াশোনার জন্য উৎপাদনশীল রুটিন",
    gradient: "from-blue-500/20 to-cyan-500/10",
    habits: [
      { name: "সকালে পড়াশোনা (১ ঘণ্টা)", icon: "BookOpen", category: "পড়াশোনা ও জ্ঞান", color: "#7c3aed", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ফজরের নামাজ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "ব্যায়াম (২০ মিনিট)", icon: "Dumbbell", category: "স্বাস্থ্য ও ফিটনেস", color: "#16a34a", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ক্লাস পড়া", icon: "Briefcase", category: "পড়াশোনা ও জ্ঞান", color: "#0284c7", timeOfDay: "দুপুর", frequency: "নির্দিষ্ট দিন", frequencyDays: [0, 1, 3, 5], isIslamic: false },
      { name: "রিভিশন (৩০ মিনিট)", icon: "PenLine", category: "পড়াশোনা ও জ্ঞান", color: "#7c3aed", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ঘুমানোর আগে পড়া", icon: "BookOpen", category: "পড়াশোনা ও জ্ঞান", color: "#7c3aed", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
    ],
  },
  {
    id: "morning",
    name: "সকাল রুটিন",
    emoji: "🌅",
    description: "শক্তিশালী দিনের শুরুর অভ্যাস",
    gradient: "from-amber-500/20 to-orange-500/10",
    habits: [
      { name: "ভোরে ঘুম থেকে ওঠা", icon: "Sunrise", category: "জীবনধারা", color: "#ea580c", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ফজরের নামাজ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
      { name: "পানি পান (১ গ্লাস)", icon: "Droplets", category: "স্বাস্থ্য ও ফিটনেস", color: "#0284c7", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "সকালের ব্যায়াম", icon: "Dumbbell", category: "স্বাস্থ্য ও ফিটনেস", color: "#16a34a", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "সকালের দোয়া", icon: "Heart", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
    ],
  },
  {
    id: "health",
    name: "স্বাস্থ্য ও ফিটনেস",
    emoji: "💪",
    description: "শারীরিক সুস্থতার অভ্যাস",
    gradient: "from-emerald-500/20 to-green-500/10",
    habits: [
      { name: "৮ গ্লাস পানি", icon: "Droplets", category: "স্বাস্থ্য ও ফিটনেস", color: "#0284c7", timeOfDay: "দুপুর", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "হাঁটা (৩০ মিনিট)", icon: "Footprints", category: "স্বাস্থ্য ও ফিটনেস", color: "#16a34a", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ব্যায়াম", icon: "Dumbbell", category: "স্বাস্থ্য ও ফিটনেস", color: "#059669", timeOfDay: "সকাল", frequency: "নির্দিষ্ট দিন", frequencyDays: [6, 0, 2, 4], isIslamic: false },
      { name: "ঘুম (৭ ঘণ্টা)", icon: "BedDouble", category: "স্বাস্থ্য ও ফিটনেস", color: "#4f46e5", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "স্বাস্থ্যকর খাবার", icon: "Apple", category: "স্বাস্থ্য ও ফিটনেস", color: "#16a34a", timeOfDay: "দুপুর", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
    ],
  },
  {
    id: "mindfulness",
    name: "মানসিক সুস্থতা",
    emoji: "🧠",
    description: "মানসিক শান্তি ও মনোযোগ",
    gradient: "from-violet-500/20 to-fuchsia-500/10",
    habits: [
      { name: "ধ্যান (১০ মিনিট)", icon: "Brain", category: "মানসিক সুস্থতা", color: "#9333ea", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "ডায়েরি লেখা", icon: "PenLine", category: "মানসিক সুস্থতা", color: "#9333ea", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "কৃতজ্ঞতা লিখুন", icon: "Heart", category: "মানসিক সুস্থতা", color: "#db2777", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "গভীর শ্বাস অনুশীলন", icon: "Wind", category: "মানসিক সুস্থতা", color: "#0284c7", timeOfDay: "বিকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "তাহাজ্জুদ", icon: "Moon", category: "প্রার্থনা ও ইবাদত", color: "#0d9488", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: true },
    ],
  },
  {
    id: "productivity",
    name: "উৎপাদনশীলতা",
    emoji: "⚡",
    description: "কাজ ও সময় ব্যবস্থাপনা",
    gradient: "from-rose-500/20 to-pink-500/10",
    habits: [
      { name: "দৈনিক লক্ষ্য নির্ধারণ", icon: "Target", category: "কাজ ও পেশা", color: "#ea580c", timeOfDay: "সকাল", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "গভীর কাজ (৯০ মিনিট)", icon: "Briefcase", category: "কাজ ও পেশা", color: "#475569", timeOfDay: "সকাল", frequency: "নির্দিষ্ট দিন", frequencyDays: [0, 1, 2, 3, 4], isIslamic: false },
      { name: "ইমেইল চেক", icon: "Mail", category: "কাজ ও পেশা", color: "#0284c7", timeOfDay: "দুপুর", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
      { name: "সাপ্তাহিক পরিকল্পনা", icon: "CalendarCheck", category: "কাজ ও পেশা", color: "#7c3aed", timeOfDay: "রাত", frequency: "নির্দিষ্ট দিন", frequencyDays: [5], isIslamic: false },
      { name: "দিনের পর্যালোচনা", icon: "ClipboardCheck", category: "কাজ ও পেশা", color: "#475569", timeOfDay: "রাত", frequency: "প্রতিদিন", frequencyDays: [], isIslamic: false },
    ],
  },
];
