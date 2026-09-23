"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Eye, PartyPopper } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { Button } from "@/components/ui/button";
import { useReviewCard } from "@/hooks/use-learning";
import { cn } from "@/lib/utils";
import type { Flashcard, ReviewGrade } from "@/types/learning";

/** Grade a card shows on the back — SM-2 quality buttons. */
const GRADES: { grade: ReviewGrade; label: string; hint: string; tone: string }[] = [
  { grade: 0, label: "আবার", hint: "আজই ফিরে আসবে", tone: "bg-rose-500 hover:bg-rose-600 text-white" },
  { grade: 3, label: "কঠিন", hint: "শিগগিরই আবার", tone: "bg-amber-500 hover:bg-amber-600 text-white" },
  { grade: 4, label: "ভালো", hint: "স্বাভাবিক বিরতি", tone: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { grade: 5, label: "সহজ", hint: "অনেক পরে আবার", tone: "bg-teal-600 hover:bg-teal-700 text-white" },
];

/**
 * ReviewSession — the spaced-repetition flashcard flow. Cards flip on tap;
 * grading advances the SM-2 schedule server-side. "আবার"-graded cards stay
 * in this session's tail so they come back before the session ends.
 */
export function ReviewSession({
  open,
  onOpenChange,
  cards,
  trackTitle,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cards: Flashcard[];
  trackTitle: string;
  /** Called when the visible queue empties — parent invalidates queries. */
  onFinish?: () => void;
}) {
  const review = useReviewCard();
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [sessionOpen, setSessionOpen] = useState(false);

  // Snapshot the session queue when the modal opens (React's documented
  // "adjust state when a prop changes" pattern — no effect flash).
  if (open !== sessionOpen) {
    setSessionOpen(open);
    if (open) {
      setQueue(cards);
      setFlipped(false);
      setDoneCount(0);
    }
  }

  const current = queue[0];
  const total = cards.length;
  const remaining = queue.length;

  const grade = (g: ReviewGrade) => {
    const card = queue[0];
    if (!card) return;
    setFlipped(false);
    // Optimistic queue advance; "আবার" re-queues at the end.
    setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)));
    if (g !== 0) setDoneCount((c) => c + 1);
    review.mutate({ cardId: card.id, grade: g });
    if (g !== 0 && queue.length === 1) onFinish?.();
  };

  const progressPct = useMemo(
    () => (total > 0 ? Math.min(1, doneCount / total) : 0),
    [doneCount, total],
  );

  const isArabicFront = useMemo(
    () => !!current && /[\u0600-\u06FF]/.test(current.front),
    [current],
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="আজকের রিভিউ"
      description={`${trackTitle} • বাকি ${toBn(remaining)}টি`}
      hideHeader
      noScroll
      bodyClassName="flex min-h-[72dvh] flex-col"
    >
      <div className="flex min-h-[72dvh] flex-col">
        {/* Session header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <h2 className="text-sm font-bold">আজকের রিভিউ</h2>
            <p className="text-[11px] text-muted-foreground">
              {trackTitle} • সম্পন্ন {toBn(doneCount)}/{toBn(total)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} aria-label="রিভিউ বন্ধ করুন">
            বন্ধ
          </Button>
        </div>
        <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progressPct * 100}%` }}
          />
        </div>

        {/* Card stage */}
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          {current ? (
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "সামনের দিকে ফিরুন" : "উত্তর দেখুন"}
              className="focus-visible:ring-ring/70 w-full max-w-sm [perspective:1200px] focus-visible:ring-2 focus-visible:outline-none"
            >
              <div
                className="relative h-64 w-full [transform-style:preserve-3d]"
                style={{ transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)", transform: flipped ? "rotateY(180deg)" : "none" }}
              >
                {/* Front */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-6 shadow-md [backface-visibility:hidden]">
                  <span
                    className={cn(
                      "font-bold",
                      isArabicFront
                        ? "text-6xl leading-relaxed [direction:rtl]"
                        : "text-3xl",
                    )}
                  >
                    {current.front}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Eye className="size-3.5" aria-hidden /> দেখতে ট্যাপ করুন
                  </span>
                </div>
                {/* Back */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border bg-primary/5 p-6 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span
                    className={cn(
                      "text-center font-bold",
                      isArabicFront ? "text-3xl" : "text-2xl",
                    )}
                  >
                    {current.back}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    মনে পড়ল কতটা? নিচে বাছুন
                  </span>
                </div>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PartyPopper size={26} aria-hidden />
              </span>
              <h3 className="font-bold">আজকের রিভিউ শেষ!</h3>
              <p className="max-w-[240px] text-sm text-muted-foreground">
                {toBn(doneCount)}টি কার্ড রিভিউ করেছেন। পরের রিভিউ ঠিক সময়ে আসবে ইনশাআল্লাহ।
              </p>
              <Button onClick={() => onOpenChange(false)} className="font-bold">
                শেষ করুন
              </Button>
            </div>
          )}
        </div>

        {/* Grading rail */}
        {current && (
          <div className="sticky bottom-0 space-y-2 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
            {flipped ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => grade(g.grade)}
                    className={cn(
                      "focus-visible:ring-ring/70 flex flex-col items-center gap-0.5 rounded-2xl py-3 text-xs font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-95",
                      g.tone,
                    )}
                    aria-label={`${g.label} — ${g.hint}`}
                  >
                    {g.label}
                    <span className="text-[9px] font-medium opacity-80">{g.hint}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full font-bold"
                onClick={() => setFlipped(true)}
              >
                <RotateCcw className="size-4" aria-hidden />
                উত্তর দেখুন
              </Button>
            )}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
