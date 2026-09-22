"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Moon } from "lucide-react";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/overlays/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  HABIT_COLORS,
  HABIT_ICONS,
  TIMES_OF_DAY,
} from "@/constants";
import { useUIStore } from "@/stores/ui-store";
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  type HabitInput,
} from "@/hooks/use-habits";
import type { Frequency, HabitCategory, TimeOfDay } from "@/types";
import type { HabitWithMeta } from "@/types";

const WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

/**
 * Create/edit-habit overlay. Rendered through the unified ResponsiveModal
 * (mobile: drag-dismiss bottom sheet; desktop: centered dialog) so it shares
 * the app's one overlay system.
 */
export function HabitFormSheet() {
  const open = useUIStore((s) => s.addHabitOpen);
  const editingId = useUIStore((s) => s.editingHabitId);
  const close = useUIStore((s) => s.closeHabitForm);
  const { data: habits } = useHabits();
  const editing = habits?.find((h) => h.id === editingId) ?? null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && close()}
      title={editingId ? "অভ্যাস সম্পাদনা" : "নতুন অভ্যাস"}
      description="আপনার অভ্যাসের বিস্তারিত নির্ধারণ করুন"
    >
      {/* Only mount the form body when open so each open starts fresh */}
      {open && (
        <HabitFormBody key={editingId ?? "new"} editing={editing} editingId={editingId} onClose={close} />
      )}
    </ResponsiveModal>
  );
}

function HabitFormBody({
  editing,
  editingId,
  onClose,
}: {
  editing: HabitWithMeta | null;
  editingId: string | null;
  onClose: () => void;
}) {
  const create = useCreateHabit();
  const update = useUpdateHabit();

  const [form, setForm] = useState<HabitInput>(
    editing
      ? {
          name: editing.name,
          nameEn: editing.nameEn ?? undefined,
          icon: editing.icon,
          category: editing.category,
          color: editing.color,
          target: editing.target,
          frequency: editing.frequency,
          frequencyDays: editing.frequencyDays,
          timesPerWeek: editing.timesPerWeek,
          timeOfDay: editing.timeOfDay,
          reminderTime: editing.reminderTime ?? null,
          note: editing.note ?? null,
          isIslamic: editing.isIslamic,
        }
      : emptyForm()
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editing?.frequencyDays ?? []
  );

  const set = <K extends keyof HabitInput>(k: K, v: HabitInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return;
    const payload: HabitInput = {
      ...form,
      note: form.note?.trim() || null,
      frequencyDays: form.frequency === "নির্দিষ্ট দিন" ? selectedDays : [],
    };
    if (editingId) {
      update.mutate({ id: editingId, patch: payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="habit-name">অভ্যাসের নাম</Label>
        <Input
          id="habit-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="যেমন: প্রতিদিন কুরআন পড়া"
          maxLength={80}
          autoFocus
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>ক্যাটেগরি</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => {
            const active = form.category === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => set("category", c.name as HabitCategory)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring/70 flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-foreground/20"
                )}
              >
                <IconRenderer name={c.icon} size={16} className="shrink-0" aria-hidden />
                <span className="font-medium leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Islamic flag */}
      <button
        type="button"
        onClick={() => set("isIslamic", !form.isIslamic)}
        aria-pressed={form.isIslamic}
        className={cn(
          "focus-visible:ring-ring/70 flex w-full items-center justify-between rounded-xl border p-3 text-sm transition focus-visible:ring-2 focus-visible:outline-none",
          form.isIslamic ? "border-islamic bg-islamic/5" : "hover:border-foreground/20"
        )}
      >
        <span className="flex items-center gap-2">
          <Moon size={16} className="text-islamic" aria-hidden />
          <span className="font-medium">ইসলামিক অভ্যাস</span>
        </span>
        <span
          className={cn(
            "flex h-5 w-9 items-center rounded-full p-0.5 transition",
            form.isIslamic ? "bg-islamic" : "bg-muted"
          )}
        >
          <motion.span
            layout
            className={cn("h-4 w-4 rounded-full bg-white shadow", form.isIslamic && "ml-auto")}
          />
        </span>
      </button>

      {/* Icon picker */}
      <div className="space-y-1.5">
        <Label>আইকন</Label>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {HABIT_ICONS.map((icon) => {
            const active = form.icon === icon;
            return (
              <button
                key={icon}
                type="button"
                onClick={() => set("icon", icon)}
                aria-pressed={active}
                aria-label={icon}
                className={cn(
                  "focus-visible:ring-ring/70 flex aspect-square items-center justify-center rounded-xl border transition focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                <IconRenderer name={icon} size={18} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-1.5">
        <Label>রঙ</Label>
        <div className="flex flex-wrap gap-2.5">
          {HABIT_COLORS.map((c) => {
            const active = form.color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => set("color", c.value)}
                className={cn(
                  "focus-visible:ring-ring/70 flex size-11 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  active && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{
                  background: c.value,
                  ...(active ? { boxShadow: `0 0 0 2px ${c.value}` } : {}),
                }}
                title={c.name}
                aria-label={c.name}
                aria-pressed={active}
              >
                {active && <Check size={14} className="text-white" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time of day */}
      <div className="space-y-1.5">
        <Label>সময়</Label>
        <div className="grid grid-cols-4 gap-2">
          {TIMES_OF_DAY.map((t) => {
            const active = form.timeOfDay === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => set("timeOfDay", t.key as TimeOfDay)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring/70 flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs transition focus-visible:ring-2 focus-visible:outline-none",
                  active ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/20"
                )}
              >
                <IconRenderer name={t.icon} size={18} className="shrink-0" aria-hidden />
                <span className="font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label>কতবার</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            ["প্রতিদিন", "নির্দিষ্ট দিন", "সপ্তাহে কয়েকবার", "মাসে একবার"] as Frequency[]
          ).map((f) => {
            const active = form.frequency === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => set("frequency", f)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring/70 rounded-xl border px-3 py-2.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none",
                  active ? "border-primary bg-primary/5 text-primary" : "hover:border-foreground/20"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>

        {form.frequency === "নির্দিষ্ট দিন" && (
          <div className="mt-2 flex gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const active = selectedDays.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelectedDays((prev) =>
                      active ? prev.filter((x) => x !== i) : [...prev, i]
                    )
                  }
                  aria-pressed={active}
                  aria-label={d}
                  className={cn(
                    "focus-visible:ring-ring/70 flex-1 rounded-lg border py-2.5 text-[11px] font-medium transition focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-foreground/20"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}

        {form.frequency === "সপ্তাহে কয়েকবার" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">সপ্তাহে</span>
            <Input
              type="number"
              min={1}
              max={7}
              value={form.timesPerWeek || 3}
              onChange={(e) => set("timesPerWeek", Number(e.target.value))}
              className="w-16"
            />
            <span className="text-xs text-muted-foreground">বার</span>
          </div>
        )}
      </div>

      {/* Reminder */}
      <div className="space-y-1.5">
        <Label htmlFor="habit-reminder">রিমাইন্ডার (ঐচ্ছিক)</Label>
        <Input
          id="habit-reminder"
          type="time"
          value={form.reminderTime ?? ""}
          onChange={(e) => set("reminderTime", e.target.value || null)}
        />
      </div>

      {/* Motivation note — persisted on the habit (shown in detail view) */}
      <div className="space-y-1.5">
        <Label htmlFor="habit-note">নোট (ঐচ্ছিক)</Label>
        <Textarea
          id="habit-note"
          value={form.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          placeholder="এই অভ্যাসের লক্ষ্য বা অনুপ্রেরণা..."
          className="resize-none"
          rows={2}
          maxLength={280}
        />
      </div>

      <ResponsiveModalFooter className="px-0 sm:px-0">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-xl">
          বাতিল
        </Button>
        <Button
          type="submit"
          disabled={!form.name.trim() || create.isPending || update.isPending}
          className="flex-1 rounded-xl"
        >
          {editingId ? "সংরক্ষণ" : "যোগ করুন"}
        </Button>
      </ResponsiveModalFooter>
    </form>
  );
}

function emptyForm(): HabitInput {
  return {
    name: "",
    icon: "CheckCircle",
    category: "জীবনধারা",
    color: "#059669",
    target: "প্রতিদিন",
    frequency: "প্রতিদিন",
    frequencyDays: [],
    timesPerWeek: 3,
    timeOfDay: "সকাল",
    reminderTime: null,
    note: null,
    isIslamic: false,
  };
}
