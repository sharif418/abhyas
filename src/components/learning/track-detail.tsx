"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteTrack, usePatchTrack, useTrackDetail } from "@/hooks/use-learning";
import { ReviewSession } from "./review-session";
import { LessonProgress } from "./learning-shared";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/types/learning";

/**
 * TrackDetail — one শেখা track: lesson checklist, flashcard deck stats,
 * review entry point, and inline add/delete for both lessons and cards.
 */
export function TrackDetail({ trackId, onBack }: { trackId: string; onBack: () => void }) {
  const { data, isLoading } = useTrackDetail(trackId);
  const patch = usePatchTrack();
  const deleteTrack = useDeleteTrack();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [newLesson, setNewLesson] = useState("");
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const track = data?.track;
  const lessons = data?.lessons ?? [];
  const cards = data?.cards ?? [];
  const dueCards = cards.filter((c) => c.dueDate <= todayKeyLocal());

  const toggleLesson = (lesson: Lesson) =>
    patch.mutate({ id: trackId, action: "lesson-toggle", lessonId: lesson.id, done: !lesson.done });

  const addLesson = () => {
    if (newLesson.trim().length < 2) return;
    patch.mutate({ id: trackId, action: "lesson-add", title: newLesson.trim() });
    setNewLesson("");
  };

  const addCard = () => {
    if (newFront.trim() && newBack.trim()) {
      patch.mutate({ id: trackId, action: "card-add", front: newFront.trim(), back: newBack.trim() });
      setNewFront("");
      setNewBack("");
    }
  };

  const handleDelete = () => {
    if (track && window.confirm(`"${track.title}" ট্র্যাকটি মুছে ফেলা হবে। নিশ্চিত?`)) {
      deleteTrack.mutate(trackId, { onSuccess: onBack });
    }
  };

  if (isLoading || !track) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const complete = track.lessonCount > 0 && track.lessonsDone === track.lessonCount;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="ফিরে যান" className="-ml-2 shrink-0">
          <ArrowLeft className="size-5" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: track.color }}
            >
              <IconRenderer name={track.icon} size={18} aria-hidden />
            </span>
            <h1 className="truncate text-xl font-bold">{track.title}</h1>
            {complete && <Sparkles className="size-5 shrink-0 text-amber-500" aria-hidden />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {track.subject} • প্রতিদিন {toBn(track.minutesPerDay)} মিনিট
            {track.habitId && " • অভ্যাসের সাথে যুক্ত"}
            {track.goalId && " • লক্ষ্যের সাথে যুক্ত"}
          </p>
          <LessonProgress done={track.lessonsDone} total={track.lessonCount} className="mt-3" />
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="ট্র্যাক মুছুন" className="shrink-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {/* Review CTA */}
      {cards.length > 0 && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setReviewOpen(true)}
          disabled={dueCards.length === 0}
          className={cn(
            "focus-visible:ring-ring/70 mt-5 flex w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all focus-visible:ring-2 focus-visible:outline-none",
            dueCards.length > 0
              ? "border-primary/40 bg-primary/5 hover:shadow-md active:scale-[0.99]"
              : "cursor-default opacity-80",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Repeat2 size={22} aria-hidden />
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold">
              {dueCards.length > 0 ? `আজ ${toBn(dueCards.length)}টি কার্ড রিভিউ করুন` : "আজ কোনো কার্ড বাকি নেই"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              মনে রাখার ব্যায়াম — পুনরাবৃত্তি সহজ করে ({toBn(cards.length)}টি কার্ড মোট)
            </div>
          </div>
          {dueCards.length > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              শুরু
            </span>
          )}
        </motion.button>
      )}

      {/* Lessons */}
      <section className="mt-6" aria-label="লেসনসমূহ">
        <h2 className="text-sm font-bold">লেসন</h2>
        <div className="mt-2.5 space-y-1.5">
          {lessons.map((lesson, i) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.25) }}
              className={cn(
                "group flex items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-sm transition-colors",
                lesson.done && "border-primary/30 bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => toggleLesson(lesson)}
                disabled={patch.isPending}
                aria-pressed={lesson.done}
                aria-label={lesson.done ? `${lesson.title} সম্পন্ন — বাতিল করুন` : `${lesson.title} সম্পন্ন করুন`}
                className="focus-visible:ring-ring/70 mt-0.5 shrink-0 rounded-full transition-transform focus-visible:ring-2 focus-visible:outline-none active:scale-90"
              >
                {lesson.done ? (
                  <CheckCircle2 className="size-6 text-primary" aria-hidden />
                ) : (
                  <Circle className="size-6 text-muted-foreground/50 group-hover:text-muted-foreground" aria-hidden />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-semibold", lesson.done && "text-muted-foreground line-through")}>
                  {toBn(i + 1)}. {lesson.title}
                </div>
                {lesson.content && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{lesson.content}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => patch.mutate({ id: trackId, action: "lesson-delete", lessonId: lesson.id })}
                aria-label={`${lesson.title} মুছুন`}
                className="focus-visible:ring-ring/70 rounded-lg p-1 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/70 hover:text-destructive focus-visible:ring-2 focus-visible:outline-none"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </motion.div>
          ))}

          {/* Add lesson */}
          <div className="flex gap-2 pt-1">
            <Input
              value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLesson()}
              placeholder="নতুন লেসন/অধ্যায়…"
              maxLength={120}
              aria-label="নতুন লেসনের নাম"
            />
            <Button onClick={addLesson} size="icon" aria-label="লেসন যোগ করুন" className="shrink-0">
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="mt-6" aria-label="ফ্ল্যাশকার্ড">
        <h2 className="text-sm font-bold">ফ্ল্যাশকার্ড ({toBn(cards.length)})</h2>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {cards.slice(0, 12).map((card) => (
            <div
              key={card.id}
              className="group flex items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-semibold">{card.front}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="truncate text-muted-foreground">{card.back}</span>
              </div>
              <button
                type="button"
                onClick={() => patch.mutate({ id: trackId, action: "card-delete", cardId: card.id })}
                aria-label={`কার্ড ${card.front} মুছুন`}
                className="shrink-0 rounded-lg p-1 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/70 hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {cards.length > 12 && (
            <p className="text-[11px] text-muted-foreground sm:col-span-2">
              আরও {toBn(cards.length - 12)}টি কার্ড রিভিউতে দেখা যাবে…
            </p>
          )}
        </div>

        {/* Add card */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newFront}
            onChange={(e) => setNewFront(e.target.value)}
            placeholder="সামনে (প্রশ্ন/হরফ)"
            maxLength={200}
            aria-label="কার্ডের সামনের দিক"
            className="sm:flex-1"
          />
          <Input
            value={newBack}
            onChange={(e) => setNewBack(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCard()}
            placeholder="পিছনে (উত্তর)"
            maxLength={300}
            aria-label="কার্ডের পিছনের দিক"
            className="sm:flex-1"
          />
          <Button onClick={addCard} size="icon" aria-label="কার্ড যোগ করুন" className="shrink-0 sm:size-10">
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </section>

      {/* Review session modal */}
      <ReviewSession
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        cards={dueCards}
        trackTitle={track.title}
      />
    </div>
  );
}

function todayKeyLocal(): string {
  const now = new Date();
  const dhaka = new Date(now.getTime() + 6 * 60 * 60 * 1000); // Asia/Dhaka (UTC+6)
  return dhaka.toISOString().slice(0, 10);
}
