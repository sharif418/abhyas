"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Check } from "lucide-react";
import { useTasbihStore } from "@/stores/tasbih-store";
import { TASBIH_PRESETS } from "@/constants";
import { toBn } from "@/lib/date-bn";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";

export function TasbihCounter() {
  const { presetId, count, round, target, totalToday, setPreset, tap, reset } =
    useTasbihStore();
  const preset = TASBIH_PRESETS.find((p) => p.id === presetId) ?? TASBIH_PRESETS[0];
  const progress = count / target;

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-islamic/10 via-card to-card p-5 shadow-sm">
      <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-islamic/15 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📿</span>
            <div>
              <h2 className="font-bold leading-tight">তাসবিহ কাউন্টার</h2>
              <p className="text-[11px] text-muted-foreground">যিকর গণনা করুন</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/70"
            aria-label="রিসেট"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Preset selector */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TASBIH_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                presetId === p.id
                  ? "border-islamic bg-islamic text-islamic-foreground"
                  : "bg-card text-muted-foreground hover:border-islamic/40"
              )}
            >
              {p.bengali}
            </button>
          ))}
        </div>

        {/* Counter display + tap area */}
        <div className="flex flex-col items-center gap-3">
          <div
            dir="rtl"
            className="text-2xl font-bold text-islamic"
            style={{ fontFamily: "var(--font-bengali), serif" }}
          >
            {preset.arabic}
          </div>
          <div className="text-xs text-muted-foreground">
            {preset.transliteration}
          </div>

          <button
            onClick={tap}
            className="relative active:scale-95 transition"
            aria-label="গণনা করুন"
          >
            <ProgressRing
              value={progress}
              size={160}
              stroke={8}
              color="var(--islamic)"
              animate={false}
            >
              <div className="text-center">
                <motion.div
                  key={count}
                  initial={{ scale: 1.3, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="tabular text-4xl font-extrabold text-islamic"
                >
                  {toBn(count)}
                </motion.div>
                <div className="text-[10px] text-muted-foreground">
                  / {toBn(target)}
                </div>
              </div>
            </ProgressRing>
          </button>

          {/* Stats */}
          <div className="flex gap-3 text-center">
            <div>
              <div className="tabular text-lg font-bold">{toBn(round)}</div>
              <div className="text-[10px] text-muted-foreground">চক্র</div>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="tabular text-lg font-bold">{toBn(totalToday)}</div>
              <div className="text-[10px] text-muted-foreground">আজ মোট</div>
            </div>
          </div>

          <AnimatePresence>
            {count === 0 && round > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 rounded-full bg-islamic/15 px-3 py-1 text-xs font-semibold text-islamic"
              >
                <Check size={12} /> চক্র সম্পন্ন! মাশাআল্লাহ
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
