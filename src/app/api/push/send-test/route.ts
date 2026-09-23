import { NextResponse } from "next/server";
import webPush from "web-push";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { isPushConfigured, sendPushNotification } from "@/lib/push-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/send-test — send one test Web Push to the current user's
 * subscribed devices. Powers the Profile "পুশ পরীক্ষা" button; dead
 * subscriptions (410/404) are pruned like the scheduler does.
 *
 * (Named "send-test", not "test": the .gitignore's old bare `test` pattern
 * silently untracked any path containing a "test" component.)
 */
export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "সার্ভারে VAPID কী কনফিগার করা নেই" },
      { status: 503 }
    );
  }

  const user = await getOrCreateUser();
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: user.id },
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: false });
  }

  let sent = 0;
  let pruned = 0;
  for (const sub of subscriptions) {
    try {
      await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
          expirationTime: sub.expirationTime ?? undefined,
        },
        {
          title: "অভ্যাস পুশ পরীক্ষা",
          body: "এটি একটি পরীক্ষামূলক নোটিফিকেশন — সব ঠিক আছে!",
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: "test-push",
          data: { url: "/" },
        }
      );
      sent++;
    } catch (err) {
      if (err instanceof webPush.WebPushError) {
        const statusCode = err.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await db.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
          pruned++;
        }
      }
      // other failures: reported via the sent count, not a 5xx — the
      // remaining subscriptions may still succeed.
    }
  }

  return NextResponse.json({ sent: sent > 0, delivered: sent, pruned });
}
