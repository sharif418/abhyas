"use client";

import { motion } from "framer-motion";
import { ArrowRight, MoonStar, ShieldCheck } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useFocusDndStore } from "@/stores/focus-dnd-store";
import { Switch } from "@/components/ui/switch";
import { isNativeApp } from "@/lib/native/capacitor";
import { useScreenTime } from "@/hooks/use-screen-time";
import { AppLimitsSection } from "./app-limits-section";
import { ContentGuardSection } from "./content-guard-section";
import { ScreenTimeSection } from "./screen-time-section";
import { SleepSection } from "./sleep-section";
import { cn } from "@/lib/utils";

/**
 * নিয়ন্ত্রণ কেন্দ্র (Control Center) — the phone-control hub:
 *  1. ফোকাস মোড — system-wide DND (floating button's home base)
 *  2. অ্যাপ ব্যবহারের সময়সীমা — per-app daily budgets + থামানোর স্ক্রিন
 *  3. স্ক্রিন-টাইম রিপোর্ট — 7-day usage, week-over-week, top apps
 *  4. রাতের বিশ্রাম ও ঘুম — bedtime wind-down DND + sleep estimate
 *  5. সামগ্রী নিয়ন্ত্রণ — DNS-level content filter
 *
 * Everything degrades honestly on the web (install CTA instead of fake
 * switches), and every control can be turned OFF — trust before control.
 */
export function GuardView() {
  // One shared data source for the report + sleep sections (no double fetch).
  const screenTime = useScreenTime();

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold">নিয়ন্ত্রণ কেন্দ্র</h1>
          <p className="text-xs text-muted-foreground">
            ফোকাস, অ্যাপের সময়, রাতের বিশ্রাম ও সামগ্রী — আপনার হাতে পুরো নিয়ন্ত্রণ
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
        এই নিয়ন্ত্রণগুলো ফোনের অপারেটিং সিস্টেমে কাজ করে — তাই অ্যান্ড্রয়েড অ্যাপ লাগে।
        সব ডেটা শুধু আপনার ফোনেই থাকে, আর যেকোনোটি যেকোনো সময় বন্ধ করা যায়।
      </p>

      <div className="mt-4 space-y-4">
        <FocusQuickCard />
        <AppLimitsSection />
        <ScreenTimeSection screenTime={screenTime} />
        <SleepSection screenTime={screenTime} />
        <ContentGuardSection />
      </div>

      <p className="mt-6 pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        ইবাদতের সময় ফোকাস মোড দিয়ে নোটিফিকেশন বন্ধ রাখুন • সোশ্যাল মিডিয়ায় সময়সীমা ও
        থামানোর স্ক্রিন দিন • রাতে ফোন রেখে ঘুমান • পরিবারকে অশ্লীল সামগ্রী থেকে বাঁচান
      </p>
    </div>
  );
}

/** Compact focus-mode status + toggle (shares the FAB's store). */
function FocusQuickCard() {
  const setView = useUIStore((s) => s.setView);
  const active = useFocusDndStore((s) => s.active);
  const busy = useFocusDndStore((s) => s.busy);
  const toggle = useFocusDndStore((s) => s.toggle);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="focus-quick-title"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            active ? "bg-islamic/10 text-islamic" : "bg-muted text-muted-foreground"
          )}
        >
          <MoonStar className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="focus-quick-title" className="text-sm font-bold">
            ফোকাস মোড
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              {isNativeApp() ? "সিস্টেম-লেভেল DND" : "ওয়েব ফোকাস"}
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {active
              ? "চালু আছে — সব অ্যাপের নোটিফিকেশন বন্ধ"
              : isNativeApp()
                ? "চালু করলে সব অ্যাপের নোটিফিকেশন, কল ও রিংটোন বন্ধ হবে"
                : "চালু করলে ফুলস্ক্রিন ফোকাস + স্ক্রিন জাগা থাকবে"}
          </p>
        </div>
        <Switch
          checked={active}
          disabled={busy}
          onCheckedChange={() => void toggle()}
          aria-label="ফোকাস মোড চালু/বন্ধ"
        />
      </div>
      <button
        type="button"
        onClick={() => setView("focus")}
        className="flex w-full items-center justify-between border-t px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>টাইমার, ইতিহাস ও সেটিংস দেখুন</span>
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </motion.section>
  );
}
