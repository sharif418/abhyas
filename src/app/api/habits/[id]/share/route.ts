import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { computeBestStreak, computeCurrentStreak } from "@/lib/streaks";
import { serializeHabit } from "@/lib/habits-server";
import { toBn } from "@/lib/date-bn";

export const dynamic = "force-dynamic";

/**
 * GET /api/habits/:id/share — generates a shareable text summary for a habit.
 * Returns formatted Bengali text with stats + a deep link back to the app.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== user.id) {
    return NextResponse.json({ error: "পাওয়া যায়নি" }, { status: 404 });
  }

  const completions = await db.habitCompletion.findMany({
    where: { habitId: id },
    select: { date: true },
  });
  const completedSet = new Set(completions.map((c) => c.date));
  const serialized = serializeHabit(habit);
  const currentStreak = computeCurrentStreak(serialized, completedSet);
  const bestStreak = computeBestStreak(serialized, Array.from(completedSet));

  const completionRate =
    completions.length > 0
      ? Math.round(
          (completions.filter((c) => {
            const d = new Date(c.date);
            const daysAgo = Math.floor(
              (Date.now() - d.getTime()) / 86400000
            );
            return daysAgo <= 30;
          }).length /
            Math.min(30, completions.length)) *
            100
        )
      : 0;

  const shareText = `📚 অভ্যাস অ্যাপ

🎯 ${habit.name}
${habit.isIslamic ? "🕌 ইসলামিক অভ্যাস" : ""}

🔥 বর্তমান স্ট্রিক: ${toBn(currentStreak)} দিন
🏆 সেরা স্ট্রিক: ${toBn(bestStreak)} দিন
✅ মোট সম্পন্ন: ${toBn(habit.totalDone)} বার
📊 সম্পন্নের হার: ${toBn(completionRate)}%

💪 ধারাবাহিকতাই আসল শক্তি! আপনিও শুরু করুন অভ্যাস ট্র্যাকিং।

#অভ্যাস #HabitTracker #${habit.isIslamic ? "ইসলামিক" : "স্বশাসন"}`;

  return NextResponse.json({
    text: shareText,
    stats: {
      name: habit.name,
      currentStreak,
      bestStreak,
      totalDone: habit.totalDone,
      completionRate,
      isIslamic: habit.isIslamic,
    },
  });
}
