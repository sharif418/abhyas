/**
 * শেখা মডিউল — Curated track templates with real, verified starter content.
 * A template seeds lessons + flashcards; the user customizes afterwards.
 *
 * Content policy (same as daily-content.ts): only include facts that are
 * verifiably correct — Arabic letters & standard names, everyday English,
 * basic HTML tags. Nothing approximated.
 */

import type { LearningSubject } from "@/types/learning";

export interface LessonSeed {
  title: string;
  content?: string;
}

export interface CardSeed {
  front: string;
  back: string;
}

export interface TrackTemplate {
  id: string;
  title: string;
  subject: LearningSubject;
  icon: string;
  color: string;
  minutesPerDay: number;
  description: string;
  lessons: LessonSeed[];
  cards: CardSeed[];
}

export const TRACK_TEMPLATES: TrackTemplate[] = [
  {
    id: "arabic-reading",
    title: "আরবি পড়া শুরু",
    subject: "আরবি",
    icon: "Languages",
    color: "#0d9488",
    minutesPerDay: 15,
    description: "২৮টি হরফ থেকে শুরু — ধাপে ধাপে কুরআন পড়ার পথে।",
    lessons: [
      {
        title: "আরবি ২৮ হরফ চেনা",
        content: "প্রতিদিন ৫–৬টি হরফ মুখস্থ করুন। ফ্ল্যাশকার্ড ঘুরিয়ে অনুশীলন করুন।",
      },
      {
        title: "হরকত: যবর, যের, পেশ",
        content: "হরফের নিচে/উপরে চিহ্ন — যবর (–্) উপরে, যের (–ি) নিচে, পেশ (–ু) উপরে।",
      },
      { title: "সুকুন ও তানউইন" },
      { title: "মুদ (লম্বা) অক্ষর: আলিফ, ওয়াও, ইয়া" },
      { title: "যুক্ত হরফ ও সাধারণ শব্দ পড়া" },
    ],
    cards: [
      { front: "ا", back: "আলিফ" },
      { front: "ب", back: "বা" },
      { front: "ت", back: "তা" },
      { front: "ث", back: "সা" },
      { front: "ج", back: "জিম" },
      { front: "ح", back: "হা" },
      { front: "خ", back: "খা" },
      { front: "د", back: "দাল" },
      { front: "ذ", back: "যাল" },
      { front: "ر", back: "রা" },
      { front: "ز", back: "যাই" },
      { front: "س", back: "সীন" },
      { front: "ش", back: "শীন" },
      { front: "ص", back: "সোয়াদ" },
      { front: "ض", back: "দোয়াদ" },
      { front: "ط", back: "তোয়া" },
      { front: "ظ", back: "যোয়া" },
      { front: "ع", back: "আইন" },
      { front: "غ", back: "গইন" },
      { front: "ف", back: "ফা" },
      { front: "ق", back: "কোফ" },
      { front: "ك", back: "কাফ" },
      { front: "ل", back: "লাম" },
      { front: "م", back: "মীম" },
      { front: "ن", back: "নূন" },
      { front: "و", back: "ওয়াও" },
      { front: "ه", back: "হা" },
      { front: "ي", back: "ইয়া" },
    ],
  },
  {
    id: "everyday-english",
    title: "রোজকার ইংরেজি",
    subject: "ইংরেজি",
    icon: "MessageCircle",
    color: "#d97706",
    minutesPerDay: 20,
    description: "দৈনন্দিন প্রয়োজনের শব্দ ও ছোট বাক্য — আজই ব্যবহার শুরু।",
    lessons: [
      {
        title: "অভিবাদন ও পরিচয়",
        content: "Hello! My name is… / I am from Bangladesh.",
      },
      {
        title: "প্রশ্ন তৈরি করা",
        content: "What / Where / When / Why / How দিয়ে প্রশ্ন।",
      },
      { title: "সাধারণ ক্রিয়া: eat, go, come, do" },
      { title: "বাজার-দোকানে ইংরেজি" },
      { title: "ছোট গল্প পড়ে বোঝা" },
    ],
    cards: [
      { front: "Hello", back: "হ্যালো — সালাম/শুভেচ্ছা" },
      { front: "Thank you", back: "ধন্যবাদ" },
      { front: "Good morning", back: "শুভ সকাল" },
      { front: "Good night", back: "শুভ রাত্রি" },
      { front: "Please", back: "অনুগ্রহ করে" },
      { front: "Sorry", back: "দুঃখিত" },
      { front: "Excuse me", back: "মাফ করবেন / ক্ষমা করুন" },
      { front: "How are you?", back: "কেমন আছেন?" },
      { front: "Water", back: "পানি" },
      { front: "Food", back: "খাবার" },
      { front: "Help", back: "সাহায্য" },
      { front: "Today", back: "আজ" },
      { front: "Tomorrow", back: "আগামীকাল" },
      { front: "Friend", back: "বন্ধু" },
      { front: "Work", back: "কাজ" },
      { front: "How much?", back: "কত দাম?" },
    ],
  },
  {
    id: "coding-start",
    title: "কোডিং শুরু (HTML)",
    subject: "কোডিং",
    icon: "Code2",
    color: "#7c3aed",
    minutesPerDay: 25,
    description: "ওয়েবপেজ কীভাবে বানে — প্রথম পেজ আপনি নিজেই লিখবেন।",
    lessons: [
      {
        title: "ইন্টারনেট ও ওয়েবপেজ কীভাবে কাজ করে",
        content: "ব্রাউজার একটি ফাইল নামিয়ে দেখায় — সেই ফাইলই HTML।",
      },
      { title: "HTML ট্যাগ ও এলিমেন্ট ধারণা" },
      { title: "শিরোনাম, প্যারাগ্রাফ, লিংক, ছবি" },
      { title: "তালিকা (list) তৈরি" },
      { title: "নিজের প্রথম পেজ বানানো" },
    ],
    cards: [
      { front: "<h1>", back: "বড় শিরোনাম (heading 1)" },
      { front: "<p>", back: "প্যারাগ্রাফ (paragraph)" },
      { front: "<a>", back: "লিংক (anchor)" },
      { front: "<img>", back: "ছবি (image)" },
      { front: "<ul>", back: "বিন্দু তালিকা (unordered list)" },
      { front: "<li>", back: "তালিকার আইটেম (list item)" },
      { front: "<html>", back: "পেজের মূল কনটেইনার" },
      { front: "<head>", back: "পেজের তথ্য-অংশ (title ইত্যাদি)" },
      { front: "<body>", back: "পেজের দৃশ্যমান অংশ" },
      { front: "<button>", back: "বাটন" },
    ],
  },
  {
    id: "own-syllabus",
    title: "নিজের সিলেবাস",
    subject: "পড়াশোনা",
    icon: "NotebookPen",
    color: "#059669",
    minutesPerDay: 30,
    description: "HSC/ভর্তি/নিজের কোর্স — অধ্যায়গুলো নিজেই যোগ করুন।",
    lessons: [
      {
        title: "প্রথম অধ্যায় যোগ করুন",
        content: "নিচের + বাটনে চাপ দিয়ে আপনার সিলেবাসের অধ্যায়/টপিক যোগ করুন।",
      },
    ],
    cards: [],
  },
];

export function findTemplate(id: string): TrackTemplate | undefined {
  return TRACK_TEMPLATES.find((t) => t.id === id);
}
