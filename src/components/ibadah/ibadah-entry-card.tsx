"use client";

import { motion } from "framer-motion";
import { Moon, BookOpen, Sparkles } from "lucide-react";
import { useIbadahStore } from "@/stores/ibadah-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toBn } from "@/lib/date-bn";

/**
 * ইবাদত মোড entry card — the gateway into the immersive session.
 * Shown on the Islamic view (and mirrored as a quick action on Focus).
 * Two doors: কুরআন তিলাওয়াত (calm timer) and জিকির (tap counter).
 */
export function IbadahEntryCard() {
  const start = useIbadahStore((s) => s.start);
  const enabled = useSettingsStore((s) => s.ibadahModeEnabled);

  if (!enabled) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950 via-[#06231a] to-[#04140f] p-5 text-emerald-50 shadow-lg"
      aria-labelledby="ibadah-mode-title"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
            <Moon size={18} aria-hidden />
          </span>
          <div>
            <h2 id="ibadah-mode-title" className="font-bold">
              ইবাদত মোড
            </h2>
            <p className="text-xs text-emerald-300/70">
              ফুলস্ক্রিন, নোটিফিকেশন-মুক্ত নিবিড় ইবাদত
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => start("quran")}
            className="focus-visible:ring-emerald-300/70 group flex flex-col items-start gap-2 rounded-2xl bg-emerald-400/10 p-4 text-left ring-1 ring-emerald-400/20 transition-colors hover:bg-emerald-400/15 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200 transition-transform group-hover:scale-105">
              <BookOpen size={17} aria-hidden />
            </span>
            <span className="text-sm font-bold">কুরআন তিলাওয়াত</span>
            <span className="text-[11px] leading-snug text-emerald-300/60">
              স্ক্রিন জাগ্রত থাকবে, রিমাইন্ডার বন্ধ থাকবে
            </span>
          </button>

          <button
            type="button"
            onClick={() => start("dhikr")}
            className="focus-visible:ring-emerald-300/70 group flex flex-col items-start gap-2 rounded-2xl bg-emerald-400/10 p-4 text-left ring-1 ring-emerald-400/20 transition-colors hover:bg-emerald-400/15 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200 transition-transform group-hover:scale-105">
              <Sparkles size={17} aria-hidden />
            </span>
            <span className="text-sm font-bold">জিকির / তাসবিহ</span>
            <span className="font-arabic text-[11px] leading-snug text-emerald-300/60" dir="rtl">
              سُبْحَانَ اللَّه
            </span>
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300/50">
          <span aria-hidden>শান্ত পরিবেশে</span>· ফোনের ডিস্টার্ব মোড (DND) চালু রাখলে সর্বোচ্চ মনোযোগ
        </p>
      </div>
    </motion.section>
  );
}
