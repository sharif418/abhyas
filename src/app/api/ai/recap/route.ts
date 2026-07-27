import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta } from "@/lib/habits-server";
import { todayKey, lastNDays, toDateKey, addDays } from "@/lib/date-bn";
import { isScheduledOn } from "@/lib/streaks";
import { gamificationState } from "@/lib/gamification";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/ai/recap — generate a weekly recap using the LLM.
 * Summarizes the past 7 days: habit completions, mood trends, focus time,
 * streaks, and provides encouragement + a focus for the coming week.
 */
export async function GET() {
  const user = await getOrCreateUser();
  const habits = await getHabitsWithMeta();
  const last7 = lastNDays(7);

  // habit completions over last 7 days
  const completions = await db.habitCompletion.findMany({
    where: { userId: user.id, date: { gte: last7[0] } },
    select: { habitId: true, date: true },
  });
  const completionCount = completions.length;

  // scheduled count
  let scheduledCount = 0;
  for (const day of last7) {
    const d = new Date(day);
    for (const h of habits) {
      if (isScheduledOn(h, d)) scheduledCount++;
    }
  }
  const completionRate = scheduledCount > 0 ? completionCount / scheduledCount : 0;

  // mood entries
  const moodEntries = await db.moodEntry.findMany({
    where: { userId: user.id, date: { gte: last7[0] } },
    select: { date: true, mood: true },
  });
  const moodValues = moodEntries.map((m) => m.mood);
  const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 0;

  // focus sessions
  const focusSessions = await db.focusSession.findMany({
    where: { userId: user.id, date: { gte: last7[0] }, type: "work" },
    select: { durationMin: true },
  });
  const focusMinutes = focusSessions.reduce((s, f) => s + f.durationMin, 0);

  // streaks
  const activeStreaks = habits.filter((h) => h.streak > 0).length;
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);

  // XP gained this week
  const game = gamificationState(user.xp);

  // prayer tracking
  const prayerRecords = await db.prayerRecord.findMany({
    where: { userId: user.id, date: { gte: last7[0] } },
  });
  const prayersDone = prayerRecords.reduce(
    (sum, r) => sum + [r.fajr, r.dhuhr, r.asr, r.maghrib, r.isha].filter(Boolean).length,
    0
  );

  // quran
  const quranAgg = await db.quranSession.aggregate({
    where: { userId: user.id, date: { gte: last7[0] } },
    _sum: { pagesRead: true },
  });
  const quranPages = quranAgg._sum.pagesRead ?? 0;

  const context = {
    userName: user.name,
    period: "গত ৭ দিন",
    completionRate: Math.round(completionRate * 100),
    completionCount,
    scheduledCount,
    avgMood: avgMood > 0 ? Math.round(avgMood * 10) / 10 : null,
    moodDays: moodEntries.length,
    focusMinutes,
    focusSessions: focusSessions.length,
    activeStreaks,
    bestStreak,
    prayersDone,
    quranPages,
    level: game.level,
    xp: user.xp,
  };

  const systemPrompt = `তুমি একজন বন্ধুত্বপূর্ণ বাংলা অভ্যাস কোচ। ব্যবহারকারীর গত সপ্তাহের সারসংক্ষেপ তৈরি করো। উৎসাহজনক, নির্দিষ্ট এবং সংক্ষিপ্ত হও। কখনো তিরস্কার করবে না। সবসময় বাংলায় উত্তর দাও। উত্তর অবশ্যই নিচের JSON ফরম্যাটে হতে হবে, অন্য কোনো টেক্সট নয়:
{
  "headline": "এক লাইনের সাপ্তাহিক সারসংক্ষেপ (উৎসাহজনক)",
  "highlights": ["সপ্তাহের সেরা অর্জন ১", "সেরা অর্জন ২", "সেরা অর্জন ৩"],
  "improvement": "যেখানে উন্নতি দরকার তার এক বাক্যে বিবরণ",
  "nextWeekFocus": "আগামী সপ্তাহের জন্য একটি নির্দিষ্ট লক্ষ্য"
}
প্রতিটি আইটেম ১-২ বাক্যের মধ্যে রাখো। সংখ্যা ব্যবহার করে নির্দিষ্ট করো।`;

  const userPrompt = `ব্যবহারকারীর গত ৭ দিনের ডেটা:
${JSON.stringify(context, null, 2)}

এই তথ্যের ভিত্তিতে একটি সাপ্তাহিক সারসংক্ষেপ তৈরি করো। নির্দিষ্ট সংখ্যা উল্লেখ করো। যদি কোনো ক্যাটেগরিতে ডেটা না থাকে, সেটা স্বাভাবিকভাবে উল্লেখ করো।`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ ...parsed, context });
    }
    return NextResponse.json(buildFallback(context));
  } catch {
    return NextResponse.json(buildFallback(context));
  }
}

function buildFallback(ctx: any): {
  headline: string;
  highlights: string[];
  improvement: string;
  nextWeekFocus: string;
} {
  const headline =
    ctx.completionCount > 0
      ? `গত সপ্তাহে ${ctx.completionCount} টি অভ্যাস সম্পন্ন — চমৎকার!`
      : "এই সপ্তাহে শুরু করার সুযোগ আছে।";

  const highlights: string[] = [];
  if (ctx.bestStreak > 0)
    highlights.push(`সেরা স্ট্রিক: ${ctx.bestStreak} দিন`);
  if (ctx.focusMinutes > 0)
    highlights.push(`${ctx.focusMinutes} মিনিট ফোকাস কাজ`);
  if (ctx.prayersDone > 0)
    highlights.push(`${ctx.prayersDone} বার নামাজ আদায়`);
  if (ctx.quranPages > 0)
    highlights.push(`${ctx.quranPages} পৃষ্ঠা কুরআন তিলাওয়াত`);
  if (highlights.length === 0)
    highlights.push("নতুন অভ্যাস যোগ করে শুরু করুন");

  const improvement =
    ctx.completionRate < 50
      ? "সম্পন্নের হার বাড়ানো দরকার — ছোট লক্ষ্যে শুরু করুন।"
      : "ধারাবাহিকতা বজায় রাখুন।";

  const nextWeekFocus =
    ctx.focusMinutes === 0
      ? "আগামী সপ্তাহে প্রতিদিন ২৫ মিনিট ফোকাস কাজ করুন।"
      : ctx.avgMood === null
      ? "প্রতিদিন মুড লগ করার অভ্যাস তৈরি করুন।"
      : "একটি নতুন অভ্যাস যোগ করে রুটিন বাড়ান।";

  return { headline, highlights, improvement, nextWeekFocus };
}
