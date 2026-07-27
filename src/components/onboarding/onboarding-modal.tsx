"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { STARTER_PRESETS } from "@/constants/starter-presets";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";

const STORAGE_KEY = "abhyas-onboarding-done";

/**
 * First-run onboarding modal.
 * Shows a 3-step welcome: intro → pick starter habits → done.
 * Persists completion in localStorage so it shows only once.
 */
export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([
    "fajr",
    "quran",
    "exercise",
    "water",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  // gate on first visit only
  useState(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    // small delay so it doesn't fight with initial hydration
    setTimeout(() => setOpen(true), 600);
  });

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const finish = async () => {
    setSubmitting(true);
    try {
      // create each selected preset habit
      for (const id of selected) {
        const p = STARTER_PRESETS.find((x) => x.id === id);
        if (!p) continue;
        await api.post("/api/habits", {
          name: p.name,
          icon: p.icon,
          category: p.category,
          color: p.color,
          target: "প্রতিদিন",
          frequency: "প্রতিদিন",
          frequencyDays: [],
          timesPerWeek: 0,
          timeOfDay: p.timeOfDay,
          isIslamic: p.isIslamic,
        });
      }
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        /* ignore */
      }
      fireConfetti({ count: 140, duration: 1100 });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>অভ্যাস অনবোর্ডিং</DialogTitle>
          <DialogDescription>
            আপনার যাত্রা শুরু করতে স্টার্টার অভ্যাস বাছাই করুন
          </DialogDescription>
        </VisuallyHidden>
        {/* Progress header */}
        <div className="flex gap-1 bg-muted/50 px-5 pt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#0d9488] text-3xl font-bold text-primary-foreground shadow-lg"
              >
                অ
              </motion.div>
              <h2 className="text-xl font-bold">অভ্যাসে স্বাগতম! 👋</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                ছোট অভ্যাস দিয়ে বড় পরিবর্তন। আসুন আপনার যাত্রা শুরু করি —
                প্রতিদিন এক ধাপ এগিয়ে।
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
                <Feature emoji="🔥" label="স্ট্রিক ট্র্যাক" />
                <Feature emoji="🕌" label="ইসলামিক" />
                <Feature emoji="🏆" label="ব্যাজ ও XP" />
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => setStep(1)}
                size="lg"
              >
                শুরু করুন
              </Button>
              <button
                onClick={skip}
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
              >
                এখনই নয়
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-5 py-6"
            >
              <div className="mb-1 flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-lg font-bold">অভ্যাস বাছাই করুন</h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                যেগুলো দিয়ে শুরু করতে চান সেগুলো নির্বাচন করুন (পরে আরও যোগ করতে পারবেন)।
              </p>
              <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto fancy-scroll pr-1 sm:grid-cols-2">
                {STARTER_PRESETS.map((p) => {
                  const active = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-2xl border p-3 text-left transition",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-foreground/20"
                      )}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: p.color }}
                      >
                        <IconRenderer name={p.icon} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {p.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {p.desc}
                        </div>
                      </div>
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  পেছনে
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={selected.length === 0}
                  className="flex-[2]"
                >
                  {selected.length > 0
                    ? `${selected.length} টি যোগ করুন`
                    : "নির্বাচন করুন"}
                  <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0d9488] text-4xl shadow-lg"
              >
                🎯
              </motion.div>
              <h2 className="text-xl font-bold">প্রস্তুত!</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                আপনার <span className="font-bold text-primary">{selected.length}</span> টি অভ্যাস
                যোগ হতে যাচ্ছে। প্রতিদিন এক ট্যাপে সম্পন্ন করুন, স্ট্রিক বাড়ান, ব্যাজ আনলক করুন।
              </p>
              <div className="mt-4 rounded-2xl bg-muted/50 p-3 text-left text-xs">
                <div className="font-semibold">💡 টিপস</div>
                <p className="mt-1 text-muted-foreground">
                  প্রতিদিন একই সময়ে অভ্যাস সম্পন্ন করলে তা দ্রুত অভ্যাসে পরিণত হয়।
                </p>
              </div>
              <Button
                className="mt-6 w-full"
                onClick={finish}
                disabled={submitting}
                size="lg"
              >
                {submitting ? "যোগ হচ্ছে..." : "চলুন শুরু করি! 🚀"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <div className="text-lg">{emoji}</div>
      <div className="mt-0.5 font-medium">{label}</div>
    </div>
  );
}
