import { toBn } from "./date-bn";
import type { GamificationState } from "@/types";

/**
 * XP & Level engine.
 *
 * XP curve: each level requires progressively more XP.
 * xpForLevel(n) = 50 * n * (n + 1)  → quadratic growth (gentle early game).
 *   L1→L2 needs 100, L2→L3 needs 300, ... L9→L10 needs 1000.
 */

export function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

export function totalXpForLevel(level: number): number {
  // sum of xpForLevel(1..level-1)
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level++;
  return level;
}

export function gamificationState(xp: number): GamificationState {
  const level = levelFromXp(xp);
  const xpAtLevelStart = totalXpForLevel(level);
  const xpAtNextLevel = totalXpForLevel(level + 1);
  const xpInLevel = xp - xpAtLevelStart;
  const xpForNextLevel = xpAtNextLevel - xpAtLevelStart;
  return {
    xp,
    level,
    xpInLevel,
    xpForNextLevel,
    progress: xpForNextLevel === 0 ? 0 : xpInLevel / xpForNextLevel,
  };
}

/** XP awarded for a habit completion (with streak bonus). */
export function xpForCompletion(streak: number, isIslamic = false): number {
  const base = 10;
  const streakBonus = Math.min(streak, 30) * 2; // cap bonus
  const islamicBonus = isIslamic ? 5 : 0;
  return base + streakBonus + islamicBonus;
}

/** XP awarded for completing all scheduled habits in a day. */
export const PERFECT_DAY_XP = 50;

/** Level title in Bengali for flair. */
export function levelTitle(level: number): string {
  if (level < 3) return "নবীন";
  if (level < 6) return "অনুশীলনশীল";
  if (level < 10) return "নিয়মানুবর্তী";
  if (level < 15) return "আত্মনিয়ন্ত্রিত";
  if (level < 20) return "সাধক";
  if (level < 30) return "প্রভাবী";
  return "আদর্শ";
}

export function bnLevelTitle(level: number): string {
  return `${toBn(level)} • ${levelTitle(level)}`;
}
