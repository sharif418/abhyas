"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function HabitFormSheet() {
  const open = useUIStore((s) => s.addHabitOpen);
  const editingId = useUIStore((s) => s.editingHabitId);
  const close = useUIStore((s) => s.closeHabitForm);
  const { data: habits } = useHabits();
  const editing = habits?.find((h) => h.id === editingId) ?? null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md max-h-[100dvh]">
        {/* Only mount the form body when open so each open starts fresh */}
        {open && (
          <HabitFormBody
            key={editingId ?? "new"}
            editing={editing}
            editingId={editingId}
            onClose={close}
          />
        )}
      </SheetContent>
    </Sheet>
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
      frequencyDays: form.frequency === "নির্দিষ্ট দিন" ? selectedDays : [],
    };
    if (editingId) {
      update.mutate({ id: editingId, patch: payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <SheetHeader className="border-b px-5 py-4 shrink-0">
        <SheetTitle>{editingId ? "অভ্যাস সম্পাদনা" : "নতুন অভ্যাস"}</SheetTitle>
        <SheetDescription>
          আপনার অভ্যাসের বিস্তারিত নির্ধারণ করুন
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="fancy-scroll min-h-0 flex-1 px-5 py-4">
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">অভ্যাসের নাম</Label>
            <Input
              id="habit-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="যেমন: প্রতিদিন কুরআন পড়া"
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
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-foreground/20"
                    )}
                  >
                    <span className="text-base">{c.emoji}</span>
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
            className={cn(
              "flex w-full items-center justify-between rounded-xl border p-3 text-sm transition",
              form.isIslamic
                ? "border-islamic bg-islamic/5"
                : "hover:border-foreground/20"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-base">🕌</span>
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
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow",
                  form.isIslamic && "ml-auto"
                )}
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
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl border transition",
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
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => {
                const active = form.color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set("color", c.value)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition",
                      active && "ring-2 ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      background: c.value,
                      ...(active ? { boxShadow: `0 0 0 2px ${c.value}` } : {}),
                    }}
                    title={c.name}
                    aria-label={c.name}
                  >
                    {active && <Check size={14} className="text-white" />}
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
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs transition",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:border-foreground/20"
                    )}
                  >
                    <span className="text-base">{t.emoji}</span>
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
                [
                  "প্রতিদিন",
                  "নির্দিষ্ট দিন",
                  "সপ্তাহে কয়েকবার",
                  "মাসে একবার",
                ] as Frequency[]
              ).map((f) => {
                const active = form.frequency === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("frequency", f)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:border-foreground/20"
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
                      className={cn(
                        "flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition",
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
            <Label>রিমাইন্ডার (ঐচ্ছিক)</Label>
            <Input
              type="time"
              value={form.reminderTime ?? ""}
              onChange={(e) => set("reminderTime", e.target.value || null)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="habit-note">নোট (ঐচ্ছিক)</Label>
            <Textarea
              id="habit-note"
              placeholder="এই অভ্যাসের লক্ষ্য বা অনুপ্রেরণা..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
      </ScrollArea>

      <SheetFooter className="shrink-0 border-t px-5 py-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          বাতিল
        </Button>
        <Button
          onClick={submit}
          disabled={!form.name.trim() || create.isPending || update.isPending}
          className="flex-1"
        >
          {editingId ? "সংরক্ষণ" : "যোগ করুন"}
        </Button>
      </SheetFooter>
    </div>
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
    isIslamic: false,
  };
}
