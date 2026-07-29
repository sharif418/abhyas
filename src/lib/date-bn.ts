import { BN_DIGITS, BENGALI_MONTHS, BENGALI_WEEKDAYS } from "@/types";

/**
 * Bengali-first date & number utilities.
 * All dates are anchored to Asia/Dhaka to match the target audience.
 */

export const DHAKA_TZ = "Asia/Dhaka";

/** Convert any number/string of digits to Bengali numerals. */
export function toBn(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Parse a Bengali-numeral string back to a number. */
export function fromBn(input: string): number {
  const mapped = input.replace(/[০-৯]/g, (d) =>
    String(BN_DIGITS.indexOf(d))
  );
  return Number(mapped);
}

/** Today's date as YYYY-MM-DD in Asia/Dhaka timezone. */
export function todayKey(date: Date = new Date()): string {
  return toDateKey(date);
}

/** Format a Date → YYYY-MM-DD anchored to Asia/Dhaka timezone. */
export function toDateKey(date: Date): string {
  // Use Intl.DateTimeFormat to get the date in Asia/Dhaka timezone
  // This prevents silent data corruption when the server runs in UTC
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Add days to a date, returns new Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Difference in whole days between two dates (b - a). */
export function diffDays(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db.getTime() - da.getTime()) / ms);
}

/** Bengali weekday name for a date (0=Sunday). */
export function bnWeekday(date: Date): string {
  return BENGALI_WEEKDAYS[date.getDay()];
}

/** Short Bengali weekday names (রবি, সোম, মঙ্গল, বুধ, বৃহ, শুক্র, শনি). */
const BENGALI_WEEKDAYS_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];

/** Short Bengali weekday for a date-string (YYYY-MM-DD) or Date. */
export function getBengaliWeekdayShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return BENGALI_WEEKDAYS_SHORT[d.getDay()];
}

/** Bengali month name. */
export function bnMonth(date: Date): string {
  return BENGALI_MONTHS[date.getMonth()];
}

/** "১৫ জুন, রবিবার" */
export function bnLongDate(date: Date = new Date()): string {
  return `${toBn(date.getDate())} ${bnMonth(date)}, ${bnWeekday(date)}`;
}

/** "রবিবার, ১৫ জুন" */
export function bnDayFirst(date: Date = new Date()): string {
  return `${bnWeekday(date)}, ${toBn(date.getDate())} ${bnMonth(date)}`;
}

/** Short Bengali time from "HH:mm" → "৬:৩০ সকাল" */
export function bnTime(hhmm: string): { label: string; period: string } {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const period = h < 12 ? "সকাল" : h < 16 ? "দুপুর" : h < 18 ? "বিকাল" : h < 20 ? "গোধূলি" : "রাত";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return {
    label: `${toBn(displayH)}:${toBn(String(m).padStart(2, "0"))}`,
    period,
  };
}

/** Returns array of last N date keys ending today (inclusive), oldest first. */
export function lastNDays(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(toDateKey(addDays(end, -i)));
  }
  return out;
}

/** Format minutes remaining as Bengali "১ ঘণ্টা ২০ মিনিট". */
export function bnDuration(ms: number): string {
  if (ms <= 0) return "এখন";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${toBn(h)} ঘণ্টা ${toBn(m)} মিনিট`;
  if (h > 0) return `${toBn(h)} ঘণ্টা`;
  if (m > 0) return `${toBn(m)} মিনিট`;
  return "এখন";
}

/** Greeting based on hour. */
export function bnGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "শুভ রাত";
  if (h < 12) return "শুভ সকাল";
  if (h < 16) return "শুভ দুপুর";
  if (h < 18) return "শুভ বিকাল";
  if (h < 21) return "শুভ সন্ধ্যা";
  return "শুভ রাত";
}

/** ISO weekday (1=Mon..7=Sun) — used by some calc libs. */
export function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

/** Bengali relative day label for a date key vs today. */
export function bnRelativeDay(key: string, today: Date = new Date()): string {
  const d = fromDateKey(key);
  const diff = diffDays(today, d);
  if (diff === 0) return "আজ";
  if (diff === 1) return "গতকাল";
  if (diff === -1) return "আগামীকাল";
  if (diff > 0 && diff < 7) return `${toBn(diff)} দিন আগে`;
  if (diff < 0 && diff > -7) return `${toBn(-diff)} দিন পর`;
  return bnDayFirst(d);
}
