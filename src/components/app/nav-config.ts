import type { ViewKey } from "@/types";

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: string; // lucide
}

/** Primary tabs — always visible in the bottom nav (max 5 for mobile). */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "হোম", icon: "Home" },
  { key: "habits", label: "অভ্যাস", icon: "ListChecks" },
  { key: "focus", label: "ফোকাস", icon: "Timer" },
  { key: "stats", label: "পরিসংখ্যান", icon: "BarChart3" },
  { key: "more", label: "আরও", icon: "Menu" },
];

/** Secondary views — accessible from the "More" menu. */
export const MORE_ITEMS: NavItem[] = [
  { key: "islamic", label: "ইসলামিক", icon: "Moon" },
  { key: "journal", label: "জার্নাল", icon: "BookHeart" },
  { key: "social", label: "সোশ্যাল", icon: "Users" },
  { key: "profile", label: "প্রোফাইল", icon: "User" },
];
