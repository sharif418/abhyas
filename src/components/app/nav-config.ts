import type { ViewKey } from "@/types";

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: string; // lucide
  /** Short Bengali description shown in the More sheet / sidebar tooltips. */
  description?: string;
}

/**
 * Primary tabs — always visible in the bottom nav / desktop sidebar (max 5).
 * Product decision: ইসলামিক is a primary tab (not buried in "More") because
 * prayer tracking is the app's core daily-use USP (5× daily) for the
 * Bangladeshi audience.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "হোম", icon: "Home" },
  { key: "habits", label: "অভ্যাস", icon: "ListChecks" },
  { key: "islamic", label: "ইসলামিক", icon: "Moon" },
  { key: "stats", label: "পরিসংখ্যান", icon: "BarChart3" },
  { key: "more", label: "আরও", icon: "Menu" },
];

/** Secondary views — reachable from the "আরও" bottom sheet (mobile) or sidebar (desktop). */
export const MORE_ITEMS: NavItem[] = [
  { key: "planner", label: "পরিকল্পনা", icon: "CalendarCheck", description: "দৈনিক কাজ ও রাতের রিভিউ" },
  { key: "goals", label: "লক্ষ্য", icon: "Target", description: "টার্গেট ও মাইলফলক" },
  { key: "focus", label: "ফোকাস", icon: "Timer", description: "গভীর মনোযোগের টাইমার" },
  { key: "guard", label: "নিয়ন্ত্রণ", icon: "ShieldCheck", description: "অ্যাপ সময় ও সামগ্রী নিয়ন্ত্রণ" },
  { key: "journal", label: "জার্নাল", icon: "BookHeart", description: "দৈনিক মনের খাতা" },
  { key: "social", label: "সোশ্যাল", icon: "Users", description: "বন্ধুদের সাথে প্রতিযোগিতা" },
  { key: "profile", label: "প্রোফাইল", icon: "User", description: "সেটিংস ও অ্যাকাউন্ট" },
];

/** Single source of truth for every navigable view (keyboard shortcuts, etc.). */
export const ALL_VIEWS: NavItem[] = [
  ...NAV_ITEMS.filter((n) => n.key !== "more"),
  ...MORE_ITEMS,
];
