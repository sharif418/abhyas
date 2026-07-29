import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { TEMPLATE_BUNDLES } from "@/constants/template-bundles";
import { serializeArray } from "@/lib/db-compat";

export const dynamic = "force-dynamic";

const Schema = z.object({
  bundleId: z.string().min(1),
});

/**
 * POST /api/habits/templates — install a template bundle's habits.
 * Creates all habits in the bundle with incrementing sortOrder.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "অবৈধ ইনপুট" }, { status: 400 });
  }

  const bundle = TEMPLATE_BUNDLES.find((b) => b.id === parsed.data.bundleId);
  if (!bundle) {
    return NextResponse.json({ error: "টেমপ্লেট পাওয়া যায়নি" }, { status: 404 });
  }

  const baseSort = await db.habit.count({ where: { userId: user.id } });
  const created = await db.$transaction(
    bundle.habits.map((h, i) =>
      db.habit.create({
        data: {
          userId: user.id,
          name: h.name,
          icon: h.icon,
          category: h.category,
          color: h.color,
          target: "প্রতিদিন",
          frequency: h.frequency,
          frequencyDays: serializeArray(h.frequencyDays ?? []) as any,
          timesPerWeek: 0,
          timeOfDay: h.timeOfDay,
          isIslamic: h.isIslamic,
          sortOrder: baseSort + i,
        },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    bundleId: bundle.id,
    bundleName: bundle.name,
    count: created.length,
  });
}
