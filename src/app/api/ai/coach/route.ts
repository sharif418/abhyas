import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { getHabitsWithMeta } from "@/lib/habits-server";
import { todayKey, lastNDays } from "@/lib/date-bn";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/ai/coach — generate personalized coaching insights from the user's
 * habit data using the z-ai-web-dev-sdk LLM.
 *
 * Returns structured suggestions:
 *  - encouragement (what's going well)
 *  - riskAlert (a habit in danger of breaking its streak)
 *  - suggestions (2-3 concrete next actions)
 */
export async function GET() {
  const user = await getOrCreateUser();
  const habits = await getHabitsWithMeta();

  if (habits.length === 0) {
    return NextResponse.json({
      encouragement: "শুরু করার জন্য ধন্যবাদ! প্রথম অভ্যাসটি যোগ করুন।",
      riskAlert: null,
      suggestions: [
        "একটি ছোট অভ্যাস দিয়ে শুরু করুন — যেমন প্রতিদিন ৫ মিনিট পড়া।",
        "সকালের সময় বেছে নিন, তখন অভ্যাস গড়ে ওঠা সহজ।",
      ],
    });
  }

  // Build a compact context summary for the LLM
  const today = todayKey();
  const last7 = lastNDays(7);
  const doneToday = habits.filter((h) => h.completedToday).length;
  const totalToday = habits.length;
  const activeStreaks = habits.filter((h) => h.streak > 0);
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.bestStreak), 0);

  // at-risk habits: scheduled today, not done, has a streak >= 3
  const atRisk = habits.filter(
    (h) => !h.completedToday && h.streak >= 3
  );

  // weakest habits: low completion rate
  const weakest = [...habits]
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 3)
    .map((h) => ({ name: h.name, rate: Math.round(h.completionRate * 100), streak: h.streak }));

  // strongest habits
  const strongest = [...habits]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 3)
    .map((h) => ({ name: h.name, rate: Math.round(h.completionRate * 100), streak: h.streak }));

  const context = {
    userName: user.name,
    todayProgress: `${doneToday}/${totalToday}`,
    activeStreakCount: activeStreaks.length,
    bestStreak,
    atRiskHabits: atRisk.map((h) => ({ name: h.name, streak: h.streak })),
    weakestHabits: weakest,
    strongestHabits: strongest,
    totalHabits: habits.length,
  };

  const systemPrompt = `তুমি একজন বন্ধুত্বপূর্ণ বাংলা অভ্যাস কোচ। ব্যবহারকারীর অভ্যাসের ডেটা দেখে উৎসাহজনক, নির্দিষ্ট এবং কর্মক্ষম পরামর্শ দাও। কখনো তিরস্কার করবে না। সবসময় বাংলায় উত্তর দাও। উত্তর অবশ্যই নিচের JSON ফরম্যাটে হতে হবে, অন্য কোনো টেক্সট নয়:
{
  "encouragement": "কী ভালো যাচ্ছে তার এক বাক্যে প্রশংসা",
  "riskAlert": "স্ট্রিক ভাঙার ঝুঁকিতে থাকলে তার কথা, নাহলে null",
  "suggestions": ["নির্দিষ্ট পরামর্শ ১", "নির্দিষ্ট পরামর্শ ২", "নির্দিষ্ট পরামর্শ ৩"]
}
প্রতিটি পরামর্শ ১-২ বাক্যের মধ্যে রাখো। ব্যবহারকারীর নাম ব্যবহার করে ব্যক্তিগত মনে হওয়ার মতো করো।`;

  const userPrompt = `ব্যবহারকারীর বর্তমান অবস্থা:
${JSON.stringify(context, null, 2)}

এই তথ্যের ভিত্তিতে উৎসাহজনক কোচিং দাও। ঝুঁকিতে থাকা অভ্যাস থাকলে বিশেষভাবে সতর্ক করো। দুর্বল অভ্যাসের জন্য বাস্তবসম্মত পরামর্শ দাও।`;

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
    // Extract JSON from the response (LLMs sometimes wrap in markdown)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    }
    // fallback: return raw text as a single suggestion
    return NextResponse.json({
      encouragement: "আপনি ভালো করছেন!",
      riskAlert: null,
      suggestions: [raw.slice(0, 200) || "আজকের অভ্যাসগুলো সম্পন্ন করুন।"],
    });
  } catch (e) {
    // graceful fallback if the LLM is unavailable
    const fallback = buildFallbackCoach(context);
    return NextResponse.json(fallback);
  }
}

/** Deterministic fallback coach (no LLM) — used if the SDK call fails. */
function buildFallbackCoach(ctx: any): {
  encouragement: string;
  riskAlert: string | null;
  suggestions: string[];
} {
  const encouragement =
    ctx.activeStreakCount > 0
      ? `${ctx.activeStreakCount} টি অভ্যাসে স্ট্রিক চলছে — চমৎকার!`
      : `আজকের অগ্রগতি ${ctx.todayProgress} — চালিয়ে যান!`;

  const riskAlert =
    ctx.atRiskHabits && ctx.atRiskHabits.length > 0
      ? `«${ctx.atRiskHabits[0].name}» এর ${ctx.atRiskHabits[0].streak} দিনের স্ট্রিক ভাঙতে পারে! দ্রুত সম্পন্ন করুন।`
      : null;

  const suggestions: string[] = [];
  if (ctx.weakestHabits?.length > 0) {
    suggestions.push(
      `«${ctx.weakestHabits[0].name}» এর হার কম — ছোট লক্ষ্যে ভাগ করে চেষ্টা করুন।`
    );
  }
  suggestions.push("আজকের বাকি অভ্যাসগুলো এক ট্যাপে সম্পন্ন করুন।");
  if (ctx.bestStreak >= 7) {
    suggestions.push(
      `আপনার সেরা স্ট্রিক ${ctx.bestStreak} দিন — সেই মানসিকতা ধরে রাখুন!`
    );
  } else {
    suggestions.push("প্রতিদিন একই সময়ে অভ্যাস করলে দ্রুত অভ্যাসে পরিণত হয়।");
  }

  return { encouragement, riskAlert, suggestions };
}
