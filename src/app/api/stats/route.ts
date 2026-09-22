import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/stats-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — aggregate dashboard stats.
 * Thin handler: all aggregation lives in @/lib/stats-server
 * (pure helpers over habit/completion rows + the minimal DB reads).
 */
export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[api/stats] aggregation failed:", err);
    return NextResponse.json(
      { error: "পরিসংখ্যান লোড করা যায়নি" },
      { status: 500 }
    );
  }
}
