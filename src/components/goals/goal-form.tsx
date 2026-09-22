"use client";

import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/overlays/responsive-modal";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { cn } from "@/lib/utils";
import {
  GOAL_CATEGORIES,
  GOAL_TEMPLATES,
  GOAL_UNITS,
  type Goal,
} from "@/types/goals";
import { useCreateGoal, useUpdateGoal, type GoalInput } from "@/hooks/use-goals";

const ICON_CHOICES = [
  "Target", "BookOpen", "GraduationCap", "Briefcase",
  "HeartPulse", "Wallet", "Sparkles", "Languages",
  "Star", "Code", "Dumbbell", "Moon",
];

const COLOR_CHOICES = [
  "#059669", "#0d9488", "#7c3aed", "#b45309", "#dc2626", "#0369a1",
];

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Goal | null;
}

interface FormState {
  title: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  targetValue: string;
  deadline: string;
  note: string;
  milestones: { title: string; value: string }[];
}

const EMPTY: FormState = {
  title: "",
  category: "ব্যক্তিগত",
  icon: "Target",
  color: "#059669",
  unit: "ধাপ",
  targetValue: "",
  deadline: "",
  note: "",
  milestones: [],
};

/** Initial state derived once at mount — fresh on every open (see GoalForm). */
function initialState(editing?: Goal | null): FormState {
  if (!editing) return EMPTY;
  return {
    title: editing.title,
    category: editing.category,
    icon: editing.icon,
    color: editing.color,
    unit: editing.unit,
    targetValue: String(editing.targetValue),
    deadline: editing.deadline ? editing.deadline.slice(0, 10) : "",
    note: editing.note ?? "",
    milestones: editing.milestones.map((m) => ({
      title: m.title,
      value: String(m.value),
    })),
  };
}

/**
 * GoalForm — create/edit a লক্ষ্য. The body mounts fresh every time the sheet
 * opens (keyed remount), so state resets without any effect.
 */
export function GoalForm({ open, onOpenChange, editing }: GoalFormProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "লক্ষ্য সম্পাদনা" : "নতুন লক্ষ্য"}
      description="অভ্যাস হলো যাত্রা — লক্ষ্য হলো গন্তব্য"
    >
      {open ? (
        <GoalFormBody
          key={editing?.id ?? "new"}
          editing={editing ?? null}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveModal>
  );
}

function GoalFormBody({
  editing,
  onDone,
}: {
  editing: Goal | null;
  onDone: () => void;
}) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const [form, setForm] = useState<FormState>(() => initialState(editing));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyTemplate = (t: (typeof GOAL_TEMPLATES)[number]) => {
    setForm({
      ...EMPTY,
      title: t.title,
      category: t.category,
      icon: t.icon,
      color: t.color,
      unit: t.unit,
      targetValue: String(t.targetValue),
      milestones: t.milestones.map((m) => ({ title: m.title, value: String(m.value) })),
    });
    setError(null);
  };

  const addMilestone = () =>
    setForm((f) => ({ ...f, milestones: [...f.milestones, { title: "", value: "" }] }));

  const removeMilestone = (i: number) =>
    setForm((f) => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }));

  const setMilestone = (i: number, key: "title" | "value", value: string) =>
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, j) => (j === i ? { ...m, [key]: value } : m)),
    }));

  const submit = () => {
    const target = Number(form.targetValue);
    if (form.title.trim().length < 2) {
      setError("লক্ষ্যের নাম লিখুন (কমপক্ষে ২ অক্ষর)");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError("সঠিক টার্গেট সংখ্যা দিন");
      return;
    }
    if (!form.unit.trim()) {
      setError("একক (unit) লিখুন — যেমন পাতা, দিন, কেজি");
      return;
    }

    const milestones = form.milestones
      .filter((m) => m.title.trim() && Number.isFinite(Number(m.value)) && Number(m.value) > 0)
      .map((m) => ({ title: m.title.trim(), value: Number(m.value) }));

    const input: GoalInput = {
      title: form.title.trim(),
      category: form.category,
      icon: form.icon,
      color: form.color,
      unit: form.unit.trim(),
      targetValue: target,
      deadline: form.deadline || null,
      milestones,
      note: form.note.trim() || null,
    };

    // Mutations are fire-and-forget here — toasts come from the hooks.
    if (editing) update.mutate({ id: editing.id, ...input });
    else create.mutate(input);
    onDone();
  };

  const busy = create.isPending || update.isPending;

  return (
    <>
      {/* Quick templates */}
      {!editing && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Wand2 className="size-3.5" aria-hidden />
            দ্রুত শুরু করুন
          </p>
          <div className="flex flex-wrap gap-2">
            {GOAL_TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => applyTemplate(t)}
                className="focus-visible:ring-ring/70 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:outline-none"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title */}
      <label className="mb-1 block text-xs font-semibold" htmlFor="goal-title">
        লক্ষ্যের নাম
      </label>
      <Input
        id="goal-title"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="যেমন: কুরআন খতম — ৩০ পারা"
        maxLength={80}
      />

      {/* Category */}
      <p className="mt-4 mb-1.5 text-xs font-semibold">খাত</p>
      <div className="flex flex-wrap gap-1.5">
        {GOAL_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              set("category", c.key);
              set("icon", c.icon);
              set("color", c.color);
            }}
            className={cn(
              "focus-visible:ring-ring/70 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none",
              form.category === c.key
                ? "border-transparent text-white shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
            style={form.category === c.key ? { backgroundColor: c.color } : undefined}
          >
            <IconRenderer name={c.icon} size={12} />
            {c.key}
          </button>
        ))}
      </div>

      {/* Target + unit */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold" htmlFor="goal-target">
            টার্গেট
          </label>
          <Input
            id="goal-target"
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            value={form.targetValue}
            onChange={(e) => set("targetValue", e.target.value)}
            placeholder="৩০"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold" htmlFor="goal-unit">
            একক
          </label>
          <Input
            id="goal-unit"
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="পারা / দিন / কেজি"
            maxLength={12}
            list="goal-units"
          />
          <datalist id="goal-units">
            {GOAL_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Deadline */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold" htmlFor="goal-deadline">
          সময়সীমা (ঐচ্ছিক)
        </label>
        <Input
          id="goal-deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => set("deadline", e.target.value)}
        />
      </div>

      {/* Icon + colour */}
      <p className="mt-4 mb-1.5 text-xs font-semibold">আইকন</p>
      <div className="flex flex-wrap gap-1.5">
        {ICON_CHOICES.map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => set("icon", ic)}
            aria-label={ic}
            aria-pressed={form.icon === ic}
            className={cn(
              "focus-visible:ring-ring/70 flex size-9 items-center justify-center rounded-lg border transition focus-visible:ring-2 focus-visible:outline-none",
              form.icon === ic
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <IconRenderer name={ic} size={16} />
          </button>
        ))}
      </div>

      <p className="mt-4 mb-1.5 text-xs font-semibold">রঙ</p>
      <div className="flex flex-wrap gap-2">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set("color", c)}
            aria-label={`রঙ ${c}`}
            aria-pressed={form.color === c}
            className={cn(
              "focus-visible:ring-ring/70 size-7 rounded-full border-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              form.color === c ? "border-foreground" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Milestones */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold">মাইলফলক (ঐচ্ছিক)</p>
          <Button type="button" variant="ghost" size="sm" onClick={addMilestone} className="h-7 px-2 text-xs">
            <Plus className="size-3.5" aria-hidden />
            যোগ
          </Button>
        </div>
        <div className="space-y-2">
          {form.milestones.map((m, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={m.title}
                onChange={(e) => setMilestone(i, "title", e.target.value)}
                placeholder="মাইলফলকের নাম"
                maxLength={60}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={m.value}
                onChange={(e) => setMilestone(i, "value", e.target.value)}
                placeholder="মান"
                className="w-24"
                aria-label={`${m.title || "মাইলফলক"}-এর মান (${form.unit})`}
              />
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                aria-label="মাইলফলক মুছুন"
                className="focus-visible:ring-ring/70 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:outline-none"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold" htmlFor="goal-note">
          কেন এই লক্ষ্য? (ঐচ্ছিক)
        </label>
        <Textarea
          id="goal-note"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="নিজেকে মনে করিয়ে দিন কেন এটা গুরুত্বপূর্ণ…"
          rows={2}
          maxLength={300}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </p>
      )}

      <ResponsiveModalFooter>
        <Button variant="ghost" onClick={onDone}>
          বাতিল
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? "সংরক্ষণ হচ্ছে…" : editing ? "হালনাগাদ করুন" : "লক্ষ্য তৈরি করুন"}
        </Button>
      </ResponsiveModalFooter>
    </>
  );
}
