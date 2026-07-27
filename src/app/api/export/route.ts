import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";

/**
 * GET /api/export?format=csv — export habit data as CSV.
 * Columns: habit, category, date, completed
 */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  const habits = await db.habit.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { completions: { select: { date: true } } },
  });

  if (format === "json") {
    return NextResponse.json({ habits });
  }

  // CSV
  const rows: string[] = [
    ["habit", "category", "color", "frequency", "time_of_day", "streak", "best_streak", "total_done", "completed_dates"].join(","),
  ];
  for (const h of habits) {
    const dates = h.completions.map((c) => c.date).sort().join(";");
    const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    rows.push(
      [
        csvEscape(h.name),
        csvEscape(h.category),
        h.color,
        csvEscape(h.frequency),
        csvEscape(h.timeOfDay),
        h.streak,
        h.bestStreak,
        h.totalDone,
        csvEscape(dates),
      ].join(",")
    );
  }
  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abhyas-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
