/**
 * Bangladesh calendar — Bengali special days, Islamic events, and national holidays.
 * Used to show upcoming culturally-relevant dates on the Home view.
 *
 * Note: Islamic dates shift each Gregorian year (lunar calendar). This is a
 * curated static list of the major observances for the current season; a
 * production app would compute exact Hijri dates per year.
 */

export interface SpecialDay {
  id: string;
  name: string;
  emoji: string;
  category: "bengali" | "islamic" | "national";
  /** MM-DD fixed Gregorian date (approximate for Islamic events) */
  monthDay: string;
  description: string;
  /** suggested habit theme for the day */
  habitTheme?: string;
}

export const SPECIAL_DAYS: SpecialDay[] = [
  // Bengali cultural
  {
    id: "pohela_boishakh",
    name: "পহেলা বৈশাখ",
    emoji: "🥭",
    category: "bengali",
    monthDay: "04-14",
    description: "বাংলা নববর্ষ — নতুন শুরুর দিন",
    habitTheme: "নতুন অভ্যাস শুরু করার পবিত্র দিন",
  },
  {
    id: "language_martyrs",
    name: "ভাষা শহীদ দিবস",
    emoji: "🌹",
    category: "national",
    monthDay: "02-21",
    description: "আন্তর্জাতিক মাতৃভাষা দিবস",
    habitTheme: "বাংলা ভাষা চর্চার দিন",
  },
  {
    id: "independence_day",
    name: "স্বাধীনতা দিবস",
    emoji: "🇧🇩",
    category: "national",
    monthDay: "03-26",
    description: "বাংলাদেশের স্বাধীনতা দিবস",
    habitTheme: "দেশপ্রেমের অভ্যাস চর্চা",
  },
  {
    id: "victory_day",
    name: "বিজয় দিবস",
    emoji: "🎉",
    category: "national",
    monthDay: "12-16",
    description: "বাংলাদেশের বিজয় দিবস",
    habitTheme: "কৃতজ্ঞতা প্রকাশের দিন",
  },
  // Islamic (approximate Gregorian dates for current season)
  {
    id: "eid_ul_fitr",
    name: "ঈদ-উল-ফিতর",
    emoji: "🌙",
    category: "islamic",
    monthDay: "03-31",
    description: "রমজান শেষের উৎসব",
    habitTheme: "কুরআন খতম ও দানের দিন",
  },
  {
    id: "eid_ul_adha",
    name: "ঈদ-উল-আজহা",
    emoji: "🐏",
    category: "islamic",
    monthDay: "06-07",
    description: "কুরবানির ঈদ",
    habitTheme: "ত্যাগ ও সাহায্যের দিন",
  },
  {
    id: "shab_e_barat",
    name: "শবে বরাত",
    emoji: "✨",
    category: "islamic",
    monthDay: "02-13",
    description: "মহিমান্বিত রাত",
    habitTheme: "ইবাদত ও ক্ষমার রাত",
  },
  {
    id: "shab_e_qadr",
    name: "শবে কদর",
    emoji: "🌟",
    category: "islamic",
    monthDay: "03-27",
    description: "পবিত্র কদর রাত — হাজার মাসের চেয়ে উত্তম",
    habitTheme: "তাহাজ্জুদ ও কুরআন তিলাওয়াত",
  },
  {
    id: "ashura",
    name: "আশুরা",
    emoji: "🕌",
    category: "islamic",
    monthDay: "07-06",
    description: "মহররমের ১০ তারিখ",
    habitTheme: "রোজা ও চিন্তার দিন",
  },
  {
    id: "mawlid",
    name: "ঈদে মিলাদুন্নবী",
    emoji: "💚",
    category: "islamic",
    monthDay: "09-05",
    description: "নবীর জন্মদিন",
    habitTheme: "দরুদ শরীফ বেশি পড়ার দিন",
  },
];

/**
 * Returns upcoming special days within the next N days from today.
 */
export function getUpcomingSpecialDays(withinDays: number = 60): Array<
  SpecialDay & { daysUntil: number; dateThisYear: string }
> {
  const now = new Date();
  const year = now.getFullYear();
  const results: Array<SpecialDay & { daysUntil: number; dateThisYear: string }> = [];

  for (const day of SPECIAL_DAYS) {
    const [mm, dd] = day.monthDay.split("-").map(Number);
    // try this year, if passed try next year
    let dateThisYear = new Date(year, mm - 1, dd);
    let daysUntil = Math.ceil(
      (dateThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < -1) {
      // already passed this year → use next year
      dateThisYear = new Date(year + 1, mm - 1, dd);
      daysUntil = Math.ceil(
        (dateThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      results.push({ ...day, daysUntil, dateThisYear: dateThisYear.toISOString().slice(0, 10) });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}
