"use client";

import { PrayerCard } from "./prayer-card";
import { QuranTracker } from "./quran-tracker";
import { DuaLibrary } from "./dua-library";
import { TasbihCounter } from "./tasbih-counter";

export function IslamicView() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">ইসলামিক</h1>
        <p className="text-xs text-muted-foreground">
          ইবাদত ও আধ্যাত্মিক অগ্রগতি ট্র্যাক করুন
        </p>
      </div>

      <PrayerCard />

      <div className="grid gap-5 lg:grid-cols-2">
        <QuranTracker />
        <TasbihCounter />
      </div>

      <DuaLibrary />

      <div className="rounded-2xl border border-islamic/20 bg-islamic/[0.04] p-4 text-center text-xs text-muted-foreground">
        ইসলামিক ফিচারগুলো বাংলাদেশের ব্যবহারকারীদের জন্য বিশেষভাবে তৈরি —
        নামাজ, কুরআন, দোয়া ও তাসবিহ একসাথে।
      </div>
    </div>
  );
}
