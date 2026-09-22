"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, X, RotateCcw, ChevronLeft, ChevronRight, ShieldCheck, Smartphone, BellOff } from "lucide-react";
import { useIbadahStore, DHIKR_PRESETS } from "@/stores/ibadah-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";

/**
 * ইবাদত মোড — full-screen, distraction-free immersive overlay.
 *
 * While active it owns the viewport (above every other layer):
 *  - deep serene night gradient (independent of app theme)
 *  - giant tap-to-count circle for জিকির (with Bengali numerals + target ring)
 *  - calm elapsed timer for কুরআন তিলাওয়াত
 *  - honest capability status row (fullscreen / wake lock / notifications paused)
 *  - exit gate via the unified ConfirmDialog (leaving ইবাদত is deliberate)
 *
 * The web platform cannot silence OTHER apps (WhatsApp etc.) — that is an
 * OS-level permission. The status row teaches the user to enable the device's
 * Do-Not-Disturb, which is the honest, industry-correct behaviour.
 */
export function IbadahModeOverlay() {
  const active = useIbadahStore((s) => s.active);
  const mode = useIbadahStore((s) => s.mode);
  const dhikrKey = useIbadahStore((s) => s.dhikrKey);
  const count = useIbadahStore((s) => s.count);
  const target = useIbadahStore((s) => s.target);
  const startedAt = useIbadahStore((s) => s.startedAt);
  const fullscreenGranted = useIbadahStore((s) => s.fullscreenGranted);
  const wakeLockGranted = useIbadahStore((s) => s.wakeLockGranted);
  const tap = useIbadahStore((s) => s.tap);
  const resetCount = useIbadahStore((s) => s.resetCount);
  const setDhikr = useIbadahStore((s) => s.setDhikr);
  const stop = useIbadahStore((s) => s.stop);

  const [exitConfirm, setExitConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer (1s tick only while active).
  useEffect(() => {
    if (!active || !startedAt) return;
    const tickNow = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const t = setInterval(tickNow, 1000);
    return () => clearInterval(t);
  }, [active, startedAt]);

  // Space/Enter also counts (desktop accessibility); Escape opens the exit gate.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tap();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setExitConfirm(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, tap]);

  const dhikr = useMemo(
    () => DHIKR_PRESETS.find((d) => d.key === dhikrKey) ?? DHIKR_PRESETS[0],
    [dhikrKey]
  );

  const dhikrIndex = DHIKR_PRESETS.findIndex((d) => d.key === dhikrKey);
  const progress = Math.min(1, (count % target) / target);
  const rounds = Math.floor(count / target);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          role="dialog"
          aria-modal="true"
          aria-label="ইবাদত মোড"
          className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#04140f] text-emerald-50 select-none"
        >
          {/* Ambient serenity — soft radial glows */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-emerald-700/10 blur-3xl" />
          </div>

          {/* Header: mode + elapsed + exit */}
          <header className="relative z-10 flex items-center justify-between px-5 pt-safe">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Moon size={18} aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-emerald-100">ইবাদত মোড</p>
                <p className="font-arabic text-xs text-emerald-300/70" dir="rtl">
                  {mode === "quran" ? "قُرْآن" : dhikr.arabic}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight" aria-live="off">
                <p className="tabular text-lg font-bold">
                  {toBn(mm)}:{toBn(ss)}
                </p>
                <p className="text-[10px] text-emerald-300/60">সময়</p>
              </div>
              <button
                type="button"
                onClick={() => setExitConfirm(true)}
                aria-label="ইবাদত মোড থেকে বের হন"
                className="flex size-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200 transition-colors hover:bg-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none active:scale-95"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6">
            {mode === "dhikr" ? (
              <>
                {/* Dhikr switcher */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDhikr(
                        DHIKR_PRESETS[
                          (dhikrIndex - 1 + DHIKR_PRESETS.length) % DHIKR_PRESETS.length
                        ].key
                      )
                    }
                    aria-label="পূর্ববর্তী জিকির"
                    className="flex size-10 items-center justify-center rounded-full text-emerald-300/70 transition hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                  >
                    <ChevronLeft size={20} aria-hidden />
                  </button>
                  <motion.div
                    key={dhikr.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-64 text-center"
                  >
                    <p
                      className="font-arabic text-3xl leading-relaxed text-emerald-100 sm:text-4xl"
                      dir="rtl"
                    >
                      {dhikr.arabic}
                    </p>
                    <p className="mt-1 text-sm text-emerald-300/80">
                      {dhikr.bengali} — {dhikr.meaning}
                    </p>
                  </motion.div>
                  <button
                    type="button"
                    onClick={() => setDhikr(DHIKR_PRESETS[(dhikrIndex + 1) % DHIKR_PRESETS.length].key)}
                    aria-label="পরবর্তী জিকির"
                    className="flex size-10 items-center justify-center rounded-full text-emerald-300/70 transition hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                  >
                    <ChevronRight size={20} aria-hidden />
                  </button>
                </div>

                {/* The tap circle */}
                <motion.button
                  type="button"
                  onClick={tap}
                  whileTap={{ scale: 0.96 }}
                  aria-label={`জিকির গণনা — বর্তমান ${toBn(count)}`}
                  className="group relative flex size-56 items-center justify-center rounded-full focus-visible:ring-4 focus-visible:ring-emerald-300/60 focus-visible:outline-none sm:size-64"
                >
                  {/* target progress ring */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="rgb(52 211 153 / 0.12)"
                      strokeWidth="3"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="rgb(110 231 183)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 46}
                      initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - progress) }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </svg>
                  <span className="absolute inset-3 rounded-full bg-emerald-400/5 transition-colors group-active:bg-emerald-400/10" />
                  <span className="relative text-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={count}
                        initial={{ scale: 1.12, opacity: 0.6 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="tabular block text-6xl font-extrabold text-emerald-50 sm:text-7xl"
                      >
                        {toBn(count)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="mt-1 block text-xs tracking-wide text-emerald-300/70">
                      লক্ষ্য {toBn(target)} — ট্যাপ করুন
                    </span>
                    {rounds > 0 && (
                      <span className="mt-1 block text-[10px] text-emerald-400/60">
                        {toBn(rounds)} রাউন্ড সম্পন্ন
                      </span>
                    )}
                  </span>
                </motion.button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetCount}
                    aria-label="গণনা রিসেট করুন"
                    className="flex size-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200 transition-colors hover:bg-emerald-400/20 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none active:scale-95"
                  >
                    <RotateCcw size={17} aria-hidden />
                  </button>
                </div>
              </>
            ) : (
              /* Quran mode — a calm reading companion */
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-arabic text-4xl leading-loose text-emerald-100 sm:text-5xl"
                  dir="rtl"
                >
                  اقْرَأْ بِاسْمِ رَبِّكَ
                </motion.p>
                <p className="mt-4 text-base text-emerald-200/80">মনোযোগ রেখে তিলাওয়াত করুন</p>
                <p className="mt-2 text-sm text-emerald-300/60">
                  স্ক্রিন জাগ্রত থাকবে — যতক্ষণ পড়তে চান
                </p>
              </div>
            )}
          </div>

          {/* Honest capability status row */}
          <footer className="relative z-10 mx-auto mb-safe w-full max-w-md px-5 pb-4">
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400/5 px-4 py-3 text-[11px] text-emerald-200/80 ring-1 ring-emerald-400/10">
              <span
                className="flex items-center gap-1.5"
                title="অ্যাপের নিজস্ব নোটিফিকেশন বন্ধ"
              >
                <BellOff size={13} className="text-emerald-300" aria-hidden />
                নোটিফিকেশন বন্ধ
              </span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5" title="স্ক্রিন জাগ্রত থাকবে">
                <Smartphone
                  size={13}
                  className={cn(wakeLockGranted ? "text-emerald-300" : "text-emerald-300/40")}
                  aria-hidden
                />
                স্ক্রিন সক্রিয়
              </span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5" title="ডিস্টার্ব-ফ্রি পড়ার জন্য">
                <ShieldCheck size={13} className="text-emerald-300" aria-hidden />
                {fullscreenGranted ? "ফুলস্ক্রিন" : "ডিস্টার্ব-মুক্ত"}
              </span>
            </div>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-emerald-300/50">
              হোয়াটসঅ্যাপ/মেসেঞ্জারের মতো অন্যান্য অ্যাপের নোটিফিকেশন পুরোপুরি বন্ধ করতে ফোনের{" "}
              <strong className="font-semibold text-emerald-300/80">ডিস্টার্ব মোড (DND)</strong>{" "}
              চালু রাখুন।
            </p>
          </footer>

          {/* Exit gate — leaving ইবাদত is a deliberate choice */}
          <ConfirmDialog
            open={exitConfirm}
            onOpenChange={setExitConfirm}
            variant="confirm"
            title="ইবাদত মোড শেষ করবেন?"
            description="আপনার এই সেশনের সময় ও জিকির সংরক্ষিত হবে। বের হলে স্ক্রিন সাধারণ অবস্থায় ফিরে যাবে।"
            confirmLabel="হ্যাঁ, শেষ করুন"
            onConfirm={() => {
              setExitConfirm(false);
              void stop();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
