/* ------------------------------------------------------------------ */
/*  Gamification constants                                             */
/*                                                                     */
/*  XP / level curve + Bengali level titles live in `@/lib/gamification` */
/*  (they are behavior, not data). This module holds the pure data      */
/*  milestones that drive celebration UI + XP awards.                   */
/* ------------------------------------------------------------------ */

export interface StreakMilestone {
  days: number;
  label: string;
  emoji: string;
  xp: number;
}

/** Streak milestone tiers — XP is awarded when a milestone is reached. */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, label: "১ সপ্তাহ", emoji: "🔥", xp: 50 },
  { days: 14, label: "২ সপ্তাহ", emoji: "⚡", xp: 100 },
  { days: 30, label: "১ মাস", emoji: "🏅", xp: 250 },
  { days: 60, label: "২ মাস", emoji: "🥈", xp: 500 },
  { days: 100, label: "১০০ দিন", emoji: "💯", xp: 1000 },
  { days: 180, label: "অর্ধবর্ষ", emoji: "🥇", xp: 2000 },
  { days: 365, label: "১ বছর", emoji: "👑", xp: 5000 },
];
