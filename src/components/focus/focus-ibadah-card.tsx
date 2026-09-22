"use client";

import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import { useIbadahStore } from "@/stores/ibadah-store";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * ইবাদত সেশন quick-start card — compact gateway into the immersive
 * ইবাদত মোড, shown at the top of the Focus view. One tap starts a dhikr
 * session; the full-screen overlay itself is mounted globally (AppShell).
 * Visual language mirrors `ibadah-entry-card` on the Islamic view.
 */
export function FocusIbadahCard() {
  const start = useIbadahStore((s) => s.start);
  const enabled = useSettingsStore((s) => s.ibadahModeEnabled);

  if (!enabled) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950 via-[#06231a] to-[#04140f] p-4 text-emerald-50 shadow-lg"
      aria-labelledby="focus-ibadah-title"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-14 -right-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
          <Moon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="focus-ibadah-title" className="text-sm font-bold">
            ইবাদত সেশন
          </h2>
          <p className="text-xs leading-snug text-emerald-300/70">
            জিকির/তিলাওয়াতের জন্য নিবিড় ফুলস্ক্রিন মোড
          </p>
        </div>
        <button
          type="button"
          onClick={() => start("dhikr")}
          className="focus-visible:ring-emerald-300/70 shrink-0 rounded-xl bg-emerald-400/15 px-4 py-2.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/25 transition-colors hover:bg-emerald-400/25 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
        >
          ইবাদত মোড শুরু করুন
        </button>
      </div>
    </motion.section>
  );
}
