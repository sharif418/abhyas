import { NextResponse } from "next/server";
import { getUpcomingSpecialDays } from "@/constants/bangladesh-calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar — upcoming Bangladesh special days (Bengali, Islamic, national).
 * Returns events within the next 60 days.
 */
export async function GET() {
  const days = getUpcomingSpecialDays(60);
  return NextResponse.json({ days });
}
