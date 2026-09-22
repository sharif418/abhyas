/**
 * অভ্যাস — constants barrel.
 *
 * The constants live in focused modules; this file re-exports their full
 * public surface so every existing `@/constants` import keeps working:
 *
 *   - ./habits       → categories, times of day, frequencies, colors, icons
 *   - ./badges       → achievement badge definitions
 *   - ./gamification → streak milestones (XP curve lives in @/lib/gamification)
 *   - ./misc         → Islamic constants (prayers, duas, tasbih, surahs,
 *                      BD cities) + appearance accent presets
 *   - ./moods        → canonical 1–5 mood palette (labels, colors, icons)
 *
 * Feature-scoped modules that were never part of this barrel keep their
 * direct import paths (`@/constants/settings`, `@/constants/daily-quotes`,
 * `@/constants/starter-presets`, `@/constants/template-bundles`,
 * `@/constants/bangladesh-calendar`).
 */

export * from "./habits";
export * from "./badges";
export * from "./gamification";
export * from "./misc";
export * from "./moods";
