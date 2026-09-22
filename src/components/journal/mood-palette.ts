/**
 * Back-compat shim — the canonical mood palette now lives in
 * `@/constants/moods` (re-exported through the @/constants barrel).
 * Journal components keep importing from here.
 */
export { MOODS, getMood, type MoodMeta } from "@/constants/moods";
