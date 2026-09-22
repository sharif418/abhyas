"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Star, Trash2, X } from "lucide-react";
import { toBn, fromDateKey, todayKey } from "@/lib/date-bn";
import type { PlannerTask } from "@/types/planner";
import { cn } from "@/lib/utils";

/**
 * Shared planner UI primitives — task row, add-input, phase helpers.
 * Used by both the Home card and the full পরিকল্পনা view.
 */

/** Day phase drives the planning ritual: morning plan → day run → night review. */
export type PlannerPhase = "morning" | "day" | "evening";

export function plannerPhase(h: number = new Date().getHours()): PlannerPhase {
  if (h < 11) return "morning";
  if (h < 19) return "day";
  return "evening";
}

export const PHASE_META: Record<PlannerPhase, { label: string; hint: string }> = {
  morning: {
    label: "সকালের পরিকল্পনা",
    hint: "দিন শুরুর আগে আজকের ৩টি প্রধান কাজ ঠিক করুন",
  },
  day: { label: "আজকের পরিকল্পনা", hint: "প্রধান কাজগুলো আগে শেষ করুন" },
  evening: {
    label: "রাতের রিভিউ",
    hint: "আজকের অগ্রগতি দেখুন, কাল পরিকল্পনা করুন",
  },
};

/** আজ / গতকাল / আগামীকাল label for a date key. */
export function relativeDayBn(key: string): string {
  const today = todayKey();
  if (key === today) return "আজ";
  const d = fromDateKey(key).getTime() - fromDateKey(today).getTime();
  const days = Math.round(d / 86_400_000);
  if (days === -1) return "গতকাল";
  if (days === 1) return "আগামীকাল";
  if (days < 0) return `${toBn(-days)} দিন আগে`;
  return `${toBn(days)} দিন পরে`;
}

/** Big tappable check circle — MIT variant shows the slot number. */
function TaskCheck({
  done,
  isMit,
  slot,
  onToggle,
  disabled,
}: {
  done: boolean;
  isMit: boolean;
  slot?: number;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={done ? "সম্পন্ন বাতিল করুন" : "সম্পন্ন করুন"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90",
        done
          ? "border-primary bg-primary text-primary-foreground shadow-md"
          : isMit
            ? "border-primary/60 bg-primary/5 text-primary"
            : "border-muted-foreground/30 bg-card text-transparent hover:border-primary/50"
      )}
    >
      {done ? (
        <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
          <Check size={16} strokeWidth={3} />
        </motion.span>
      ) : isMit && slot ? (
        <span className="text-xs font-bold text-primary">{toBn(slot)}</span>
      ) : (
        <Check size={14} strokeWidth={3} className="opacity-0" />
      )}
    </button>
  );
}

/** One planned item — used for both MITs and todos. */
export function PlannerTaskRow({
  task,
  slot,
  onToggle,
  onDelete,
  onPromote,
  onDemote,
  busy,
  compact,
}: {
  task: PlannerTask;
  /** MIT slot number ১–৩ (undefined for todos). */
  slot?: number;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-2xl border bg-card/80 px-3 py-2.5 shadow-sm transition-all",
        task.done && "border-primary/20 bg-primary/5",
        task.isMit && !task.done && "border-primary/25 bg-primary/[0.04]",
        compact ? "py-2" : "py-2.5"
      )}
    >
      <TaskCheck
        done={task.done}
        isMit={task.isMit}
        slot={slot}
        onToggle={() => onToggle(!task.done)}
        disabled={busy}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium leading-snug",
            task.done && "text-muted-foreground line-through decoration-primary/50"
          )}
        >
          {task.title}
        </p>
        {task.isMit && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Star size={10} fill="currentColor" aria-hidden /> প্রধান কাজ
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {task.isMit ? (
          onDemote && (
            <button
              type="button"
              onClick={onDemote}
              aria-label="সাধারণ কাজে নামান"
              className="rounded-lg p-1.5 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star size={13} />
            </button>
          )
        ) : (
          onPromote && (
            <button
              type="button"
              onClick={onPromote}
              aria-label="প্রধান কাজে উন্নীত করুন"
              className="rounded-lg p-1.5 text-muted-foreground/60 transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star size={13} />
            </button>
          )
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label="মুছে ফেলুন"
          className="rounded-lg p-1.5 text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/** Inline add-task input with an MIT toggle chip. */
export function AddTaskInput({
  onAdd,
  placeholder,
  mitDefault = false,
  allowMitToggle = true,
  autoFocus,
  inputId,
}: {
  onAdd: (title: string, isMit: boolean) => void;
  placeholder?: string;
  mitDefault?: boolean;
  allowMitToggle?: boolean;
  autoFocus?: boolean;
  inputId?: string;
}) {
  const [title, setTitle] = useState("");
  const [isMit, setIsMit] = useState(mitDefault);
  const [focused, setFocused] = useState(false);

  function submit() {
    const t = title.trim();
    if (t.length < 2) return;
    onAdd(t, isMit);
    setTitle("");
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 transition-all",
        focused ? "border-primary/50 shadow-md" : "border-dashed"
      )}
    >
      <input
        id={inputId}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setTitle("");
        }}
        placeholder={placeholder ?? "নতুন কাজ লিখুন…"}
        maxLength={120}
        autoFocus={autoFocus}
        aria-label="নতুন কাজ"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
      {allowMitToggle && (
        <button
          type="button"
          onClick={() => setIsMit((v) => !v)}
          aria-pressed={isMit}
          title="প্রধান কাজ হিসেবে চিহ্নিত করুন"
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all",
            isMit
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Star size={10} fill={isMit ? "currentColor" : "none"} aria-hidden />
          প্রধান
        </button>
      )}
      <AnimatePresence>
        {title.trim().length >= 2 && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            type="button"
            onClick={submit}
            aria-label="কাজ যোগ করুন"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-90"
          >
            <Plus size={15} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Dashed empty MIT slot — invites the morning planning ritual. */
export function EmptyMitSlot({ slot, onClick }: { slot: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.02] px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/30 text-xs font-bold text-primary/50">
        {toBn(slot)}
      </span>
      <span className="text-sm text-muted-foreground">
        {toBn(slot)} নং প্রধান কাজ — যোগ করুন
      </span>
      <Plus size={14} className="ml-auto shrink-0 text-primary/40" aria-hidden />
    </button>
  );
}

/** Compact X-button for sheets/cards. */
export function CloseIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <X size={16} />
    </button>
  );
}
