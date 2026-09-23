"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Flame, Layers, Plus, RefreshCcw } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLearning } from "@/hooks/use-learning";
import { TrackRow, LearnStat } from "./learning-shared";
import { TrackForm } from "./track-form";
import { TrackDetail } from "./track-detail";

/**
 * শেখা মডিউল — the learning home: summary hero + track list. Track detail
 * replaces this view in place (back button returns here), keeping the
 * single-page-app pattern used by the rest of the app.
 */
export function LearningView() {
  const { data, isLoading } = useLearning();
  const [formOpen, setFormOpen] = useState(false);
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);

  if (openTrackId) {
    return <TrackDetail trackId={openTrackId} onBack={() => setOpenTrackId(null)} />;
  }

  const tracks = data?.tracks ?? [];
  const active = tracks.filter((t) => !t.archived);
  const archived = tracks.filter((t) => t.archived);
  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">শেখা</h1>
          <p className="text-xs text-muted-foreground">
            অল্প অল্প প্রতিদিন — ইলমের পথে অভ্যাস
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm" className="font-bold">
          <Plus className="size-4" aria-hidden />
          নতুন ট্র্যাক
        </Button>
      </div>

      {/* Summary hero */}
      {summary && summary.tracks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">আপনার শেখার অগ্রগতি</h2>
            {summary.streakDays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Flame className="size-3.5" aria-hidden />
                {toBn(summary.streakDays)} দিন ধরে চলছে
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <LearnStat value={summary.tracks} label="ট্র্যাক" />
            <LearnStat
              value={summary.lessonsDone}
              label="লেসন শেষ"
              tone="primary"
            />
            <LearnStat value={summary.dueCards} label="রিভিউ বাকি" tone={summary.dueCards > 0 ? "amber" : "default"} />
            <LearnStat value={summary.reviewsToday} label="আজ রিভিউ" />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Layers className="size-3.5" aria-hidden />
            মোট {toBn(summary.lessonsTotal)} লেসনের মধ্যে {toBn(summary.lessonsDone)}টি সম্পন্ন
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {active.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-card/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpenText size={26} aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold">প্রথম শেখার ট্র্যাক বানান</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              আরবি পড়া, ইংরেজি, কোডিং — রেডিমেড লেসন ও ফ্ল্যাশকার্ড সহ শুরু করুন।
              প্রতিদিন ১৫ মিনিটই যথেষ্ট।
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="font-bold">
            <Plus className="size-4" aria-hidden />
            ট্র্যাক তৈরি করুন
          </Button>
        </div>
      )}

      {/* Track list */}
      {active.length > 0 && (
        <div className="mt-4 space-y-3">
          {active.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} onOpen={() => setOpenTrackId(track.id)} />
          ))}
        </div>
      )}

      {/* Archived hint */}
      {archived.length > 0 && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {toBn(archived.length)}টি ট্র্যাক স্থগিত আছে
        </p>
      )}

      {/* How-it-works strip (only when user has tracks — educates the loop) */}
      {active.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed bg-muted/30 p-4">
          <RefreshCcw className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">কীভাবে কাজ করে:</strong> লেসন শেষ করলে যুক্ত অভ্যাস
            নিজে থেকেই টিক হয় আর লক্ষ্যের অগ্রগতি বাড়ে। ফ্ল্যাশকার্ড রিভিউ স্মৃতির সাথে সাথে
            ফিরে আসে — যেটা ভুলে যাচ্ছেন, সেটাই বেশি দেখাবে (স্পেসড রিপিটিশন)।
          </p>
        </div>
      )}

      <TrackForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
