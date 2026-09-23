/**
 * শেখা মডিউল (Learning Module) — Domain Types
 * Subject tracks → lessons + SM-2 spaced-repetition flashcards,
 * linked to habits (daily practice) and goals (progress).
 */

export type LearningSubject =
  | "আরবি"
  | "ইংরেজি"
  | "কোডিং"
  | "পড়াশোনা"
  | "HSC"
  | "কুরআন"
  | "অন্য";

export interface Lesson {
  id: string;
  trackId: string;
  title: string;
  content?: string | null;
  sortOrder: number;
  done: boolean;
  doneAt?: string | null;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  trackId: string;
  front: string;
  back: string;
  /** SM-2 state */
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewedAt?: string | null;
  createdAt: string;
}

export interface LearningTrack {
  id: string;
  title: string;
  subject: LearningSubject;
  icon: string;
  color: string;
  minutesPerDay: number;
  habitId?: string | null;
  goalId?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Track + aggregate meta for the list view. */
export interface LearningTrackWithMeta extends LearningTrack {
  lessonCount: number;
  lessonsDone: number;
  cardCount: number;
  dueCards: number;
  /** Next not-done lesson, when one exists. */
  nextLesson?: { id: string; title: string } | null;
}

export interface LearningSummary {
  tracks: number;
  lessonsDone: number;
  lessonsTotal: number;
  dueCards: number;
  reviewsToday: number;
  /** A track is "practiced today" when a lesson was completed or a card reviewed today. */
  streakDays: number;
}

export interface LearningResponse {
  tracks: LearningTrackWithMeta[];
  summary: LearningSummary;
}

/** Full track detail (lessons sorted, cards sorted by due). */
export interface TrackDetailResponse {
  track: LearningTrackWithMeta;
  lessons: Lesson[];
  cards: Flashcard[];
}

export interface CreateTrackInput {
  title: string;
  subject: LearningSubject;
  templateId?: string | null;
  minutesPerDay: number;
  linkHabit: boolean;
  linkGoal: boolean;
}

/** PATCH action discriminator for /api/learning/[id]. */
export type TrackPatchAction =
  | { action: "lesson-toggle"; lessonId: string; done: boolean }
  | { action: "lesson-add"; title: string; content?: string | null }
  | { action: "lesson-delete"; lessonId: string }
  | { action: "card-add"; front: string; back: string }
  | { action: "card-delete"; cardId: string }
  | { action: "track-update"; title?: string; minutesPerDay?: number; archived?: boolean };

export interface TrackPatchResponse {
  ok: true;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  trackCompleted?: boolean;
  habitCompleted?: boolean;
}

/** POST /api/learning/review — SM-2 grade payload. */
export type ReviewGrade = 0 | 3 | 4 | 5; // আবার | কঠিন | ভালো | সহজ

export interface ReviewResponse {
  card: Flashcard;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  habitCompleted?: boolean;
}

/** XP awards — mirrors PLANNER_XP honesty (symmetric where reversible). */
export const LEARNING_XP = {
  /** Each flashcard review (small, frequent). */
  review: 2,
  /** Each lesson completed (false→true only; un-complete reverses). */
  lesson: 6,
  /** One-time bonus when every lesson of a track is done. */
  trackComplete: 40,
} as const;
