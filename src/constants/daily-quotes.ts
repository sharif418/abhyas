/**
 * Curated Bengali motivational quotes for the daily motivation card.
 * One quote per day, rotating through the list based on day-of-year.
 */

export interface Quote {
  text: string;
  author: string;
}

export const DAILY_QUOTES: Quote[] = [
  { text: "ছোট অভ্যাস দিয়ে বড় পরিবর্তন আসে। আজ শুরু করুন।", author: "অভ্যাস" },
  { text: "ধারাবাহিকতাই সফলতার মূল চাবিকাঠি।", author: "অ্যারিস্টটল" },
  { text: "আজকের কাজ আগামীকালের জন্য নয়।", author: "বাংলা প্রবাদ" },
  { text: "প্রতিটি নতুন দিন একটি নতুন সুযোগ।", author: "অভ্যাস" },
  { text: "যে ধৈর্য ধরে, সে লক্ষ্যে পৌঁছায়।", author: "বাংলা প্রবাদ" },
  { text: "নিজের উপর বিশ্বাস রাখুন, বাকিটা সময়ের ব্যাপার।", author: "অভ্যাস" },
  { text: "অভ্যাস দ্বিতীয় প্রকৃতি। ভালো অভ্যাস গড়ুন।", author: "অ্যারিস্টটল" },
  { text: "এক ধাপ এগিয়ে যান, পথ নিজে তৈরি হবে।", author: "অভ্যাস" },
  { text: "সকালের প্রথম কাজটাই দিনের সবচেয়ে গুরুত্বপূর্ণ।", author: "অভ্যাস" },
  { text: "ছোট লক্ষ্য নির্ধারণ করুন, বড় সাফল্য পান।", author: "অভ্যাস" },
  { text: "যে থামে না, সে হারে না।", author: "বাংলা প্রবাদ" },
  { text: "আজকের চেষ্টা আগামীকালের সাফল্য।", author: "অভ্যাস" },
  { text: "নিয়মিত চর্চাই পারদর্শিতার পথ।", author: "অভ্যাস" },
  { text: "মন থাকলে উপায় হয়, মন না থাকলে অজুহাত হয়।", author: "বাংলা প্রবাদ" },
  { text: "প্রতিদিন এক শতাংশ উন্নতি করুন, বছর শেষে আপনি অচেনা হয়ে যাবেন।", author: "অভ্যাস" },
  { text: "সবল ইচ্ছাশক্তিই সবচেয়ে বড় শক্তি।", author: "অভ্যাস" },
  { text: "যে শেখে, সে বাঁচে। যে চর্চা করে, সে এগিয়ে যায়।", author: "বাংলা প্রবাদ" },
  { text: "লক্ষ্য বড় রাখুন, কিন্তু পদক্ষেপ ছোট নিন।", author: "অভ্যাস" },
  { text: "আজ যা কঠিন মনে হয়, কাল তা অভ্যাসে পরিণত হবে।", author: "অভ্যাস" },
  { text: "নিজেকে চ্যালেঞ্জ করুন, কারণ আপনি নিজের চেয়ে বেশি সক্ষম।", author: "অভ্যাস" },
  { text: "ধৈর্য ধরুন, ফল আসবেই।", author: "বাংলা প্রবাদ" },
  { text: "ভালো অভ্যাস আপনার সেরা বন্ধু।", author: "অভ্যাস" },
  { text: "সময়কে সম্মান করুন, সময় আপনাকে সম্মান করবে।", author: "বাংলা প্রবাদ" },
  { text: "প্রতিটি সকাল একটি নতুন শুরু।", author: "অভ্যাস" },
  { text: "অসুবিধা অজুহাত নয়, অসুবিধা চ্যালেঞ্জ।", author: "অভ্যাস" },
  { text: "যে হাল ছাড়ে না, সে লক্ষ্যে পৌঁছায়।", author: "বাংলা প্রবাদ" },
  { text: "আগামীকালের কাজ আজ করুন, আজকের কাজ এখনই।", author: "বাংলা প্রবাদ" },
  { text: "ছোট সাফল্য উদযাপন করুন, বড় সাফল্য আসবে।", author: "অভ্যাস" },
  { text: "নিজের গতিতে এগিয়ে যান, অন্যের সাথে তুলনা করবেন না।", author: "অভ্যাস" },
  { text: "প্রতিটি দিন একটি উপহার, তা কাজে লাগান।", author: "অভ্যাস" },
];

/**
 * Returns the quote for today, based on day-of-year modulo list length.
 */
export function getDailyQuote(): Quote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}
