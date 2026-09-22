import { Angry, Frown, Meh, Smile, SmilePlus, type LucideIcon } from "lucide-react";

/**
 * Canonical typed mood palette (1–5 scale) shared by the Home mood-selector,
 * Journal timeline/chips and stats mood charts. Single source of truth so
 * the mood scale can never drift between views.
 */
export interface MoodMeta {
  /** Mood scale value as stored on the API (1 = worst … 5 = best). */
  value: 1 | 2 | 3 | 4 | 5;
  /** Mood emoji as logged/returned by the API (data display, not UI chrome). */
  emoji: string;
  label: string;
  /** Hex accent — used for the timeline dot + tinted chip via color-mix. */
  color: string;
  /** Lucide icon for chrome (filter chips); display uses the emoji. */
  icon: LucideIcon;
}

export const MOODS: MoodMeta[] = [
  { value: 1, emoji: "😞", label: "খুব খারাপ", color: "#dc2626", icon: Angry },
  { value: 2, emoji: "😕", label: "খারাপ", color: "#ea580c", icon: Frown },
  { value: 3, emoji: "😐", label: "মোটামুটি", color: "#ca8a04", icon: Meh },
  { value: 4, emoji: "🙂", label: "ভালো", color: "#16a34a", icon: Smile },
  { value: 5, emoji: "😄", label: "খুব ভালো", color: "#059669", icon: SmilePlus },
];

/** Look up a mood's metadata by its 1–5 scale value. */
export function getMood(value: number): MoodMeta | undefined {
  return MOODS.find((m) => m.value === value);
}
