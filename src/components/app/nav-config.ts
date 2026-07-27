import type { ViewKey } from "@/types";

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: string; // lucide
  emoji: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "হোম", icon: "Home", emoji: "🏠" },
  { key: "habits", label: "অভ্যাস", icon: "ListChecks", emoji: "✅" },
  { key: "stats", label: "পরিসংখ্যান", icon: "BarChart3", emoji: "📊" },
  { key: "islamic", label: "ইসলামিক", icon: "Moon", emoji: "🕌" },
  { key: "journal", label: "জার্নাল", icon: "BookHeart", emoji: "📔" },
  { key: "social", label: "সোশ্যাল", icon: "Users", emoji: "👥" },
  { key: "profile", label: "প্রোফাইল", icon: "User", emoji: "👤" },
];
