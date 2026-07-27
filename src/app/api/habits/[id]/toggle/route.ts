import { NextResponse } from "next/server";
import { z } from "zod";
import { toggleHabit } from "@/lib/habits-server";

export const dynamic = "force-dynamic";

const Schema = z.object({
  date: z.string().optional(),
});

/** POST /api/habits/:id/toggle — toggle completion for a date (default today) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }
  try {
    const result = await toggleHabit(id, parsed.data.date);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "সমস্যা হয়েছে" },
      { status: 400 }
    );
  }
}
