/**
 * লক্ষ্য (Goal) domain types — finite targets with milestones & deadlines.
 * Distinct from habits (recurring behaviours): a goal ENDS.
 */

export type GoalCategory =
  | "ইবাদত"
  | "শেখা ও দক্ষতা"
  | "কাজ ও পেশা"
  | "স্বাস্থ্য"
  | "আর্থিক"
  | "ব্যক্তিগত";

export interface GoalMilestone {
  title: string;
  /** Progress value at which this milestone completes (in goal units). */
  value: number;
  done: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: GoalCategory | string;
  icon: string;
  color: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  deadline: string | null; // ISO
  milestones: GoalMilestone[];
  note?: string | null;
  active: boolean;
  completedAt: string | null; // ISO
  createdAt: string;
  updatedAt: string;
}

/** GET /api/goals response. */
export interface GoalsResponse {
  goals: Goal[];
  summary: {
    active: number;
    completed: number;
    overallProgress: number; // 0..1 average across active goals
    dueSoon: number;
    overdue: number;
  };
}

/** POST /api/goals/[id]/progress response. */
export interface GoalProgressResponse {
  goal: Goal;
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newlyCompletedMilestones: string[];
  goalCompleted: boolean;
}

export const GOAL_CATEGORIES: { key: GoalCategory; icon: string; color: string }[] = [
  { key: "ইবাদত", icon: "Moon", color: "#0d9488" },
  { key: "শেখা ও দক্ষতা", icon: "GraduationCap", color: "#7c3aed" },
  { key: "কাজ ও পেশা", icon: "Briefcase", color: "#0f766e" },
  { key: "স্বাস্থ্য", icon: "HeartPulse", color: "#dc2626" },
  { key: "আর্থিক", icon: "Wallet", color: "#b45309" },
  { key: "ব্যক্তিগত", icon: "Sparkles", color: "#059669" },
];

/** Common units offered in the goal form (free-text allowed). */
export const GOAL_UNITS = [
  "পাতা",
  "পারা",
  "আয়াত",
  "কেজি",
  "ঘণ্টা",
  "মিনিট",
  "টাকা",
  "দিন",
  "শতাংশ",
  "টা",
  "ধাপ",
] as const;

/** Curated starter templates — one per category (Bengali-first). */
export const GOAL_TEMPLATES: {
  title: string;
  category: GoalCategory;
  icon: string;
  color: string;
  unit: string;
  targetValue: number;
  milestones: { title: string; value: number }[];
  deadlineDays?: number;
}[] = [
  {
    title: "কুরআন খতম — ৩০ পারা",
    category: "ইবাদত",
    icon: "BookOpen",
    color: "#0d9488",
    unit: "পারা",
    targetValue: 30,
    milestones: [
      { title: "১ম পারা শেষ", value: 1 },
      { title: "১০ পারা শেষ", value: 10 },
      { title: "অর্ধেক (১৫ পারা)", value: 15 },
      { title: "২০ পারা শেষ", value: 20 },
      { title: "খতম সম্পূর্ণ", value: 30 },
    ],
  },
  {
    title: "ইংরেজি স্পিকিং শেখা",
    category: "শেখা ও দক্ষতা",
    icon: "Languages",
    color: "#7c3aed",
    unit: "দিন",
    targetValue: 30,
    milestones: [
      { title: "৭ দিন অভ্যাস", value: 7 },
      { title: "১৫ দিন অভ্যাস", value: 15 },
      { title: "৩০ দিন সম্পূর্ণ", value: 30 },
    ],
  },
  {
    title: "১০ কেজি ওজন কমানো",
    category: "স্বাস্থ্য",
    icon: "HeartPulse",
    color: "#dc2626",
    unit: "কেজি",
    targetValue: 10,
    milestones: [
      { title: "২ কেজি", value: 2 },
      { title: "৫ কেজি", value: 5 },
      { title: "৮ কেজি", value: 8 },
    ],
  },
  {
    title: "সঞ্চয়ের লক্ষ্য",
    category: "আর্থিক",
    icon: "Wallet",
    color: "#b45309",
    unit: "টাকা",
    targetValue: 50000,
    milestones: [
      { title: "১০,০০০ টাকা", value: 10000 },
      { title: "২৫,০০০ টাকা", value: 25000 },
      { title: "৪০,০০০ টাকা", value: 40000 },
    ],
  },
];
