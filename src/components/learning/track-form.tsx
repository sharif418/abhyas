"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Layers } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { ResponsiveModal } from "@/components/overlays/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateTrack } from "@/hooks/use-learning";
import { TRACK_TEMPLATES, findTemplate } from "@/constants/learning-tracks";
import { cn } from "@/lib/utils";
import type { LearningSubject } from "@/types/learning";

/**
 * TrackForm — create a শেখা track, optionally seeded from a curated
 * template (real starter lessons + flashcards). The habit/goal links make
 * the track part of the app's daily loop.
 */
export function TrackForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateTrack();

  const [templateId, setTemplateId] = useState<string | null>("arabic-reading");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [linkHabit, setLinkHabit] = useState(true);
  const [linkGoal, setLinkGoal] = useState(true);

  const template = useMemo(() => (templateId ? findTemplate(templateId) : undefined), [templateId]);
  const effectiveTitle = title.trim() || template?.title || "";

  const pick = (id: string) => {
    setTemplateId(id);
    const t = findTemplate(id);
    if (t) setMinutes(t.minutesPerDay);
  };

  const submit = () => {
    if (effectiveTitle.length < 2) return;
    create.mutate(
      {
        title: effectiveTitle,
        subject: (template?.subject ?? "অন্য") as LearningSubject,
        templateId,
        minutesPerDay: minutes,
        linkHabit,
        linkGoal,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setTemplateId("arabic-reading");
          setMinutes(15);
          setLinkHabit(true);
          setLinkGoal(true);
        },
      },
    );
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="নতুন শেখার ট্র্যাক"
      description="রেডিমেড টেমপ্লেট বাছুন — লেসন ও ফ্ল্যাশকার্ড সহ শুরু হবে"
    >
      <div className="space-y-5 px-1 pb-2">
        {/* Template picker */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TRACK_TEMPLATES.map((t) => {
            const active = templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring/70 relative rounded-2xl border p-3.5 text-left transition-all focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/30",
                )}
              >
                {active && (
                  <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    <IconRenderer name={t.icon} size={17} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{t.title}</div>
                    <div className="text-[10px] text-muted-foreground">{t.subject}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-primary/90">
                  <Layers className="size-3" aria-hidden />
                  {toBn(t.lessons.length)} লেসন
                  {t.cards.length > 0 && ` • ${toBn(t.cards.length)} কার্ড`}
                </p>
              </button>
            );
          })}
        </div>

        {/* Title override */}
        <div className="space-y-1.5">
          <Label htmlFor="track-title">নাম (চাইলে বদলান)</Label>
          <Input
            id="track-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={template?.title ?? "যেমন: হাদিস মুখস্থ"}
            maxLength={60}
          />
        </div>

        {/* Minutes stepper */}
        <div className="space-y-1.5">
          <Label>প্রতিদিন কত মিনিট?</Label>
          <div className="flex items-center gap-2">
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-xs font-bold tabular-nums transition",
                  minutes === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {toBn(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="space-y-2 rounded-2xl border bg-muted/30 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold">অভ্যাস হিসেবে যোগ করুন</div>
              <div className="text-[10px] text-muted-foreground">
                &quot;{effectiveTitle || "ট্র্যাক"} — আজ {toBn(minutes)} মিনিট&quot; প্রতিদিনের অভ্যাসে দেখা যাবে
              </div>
            </div>
            <Switch checked={linkHabit} onCheckedChange={setLinkHabit} aria-label="অভ্যাস লিংক" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold">লক্ষ্যের সাথে যুক্ত করুন</div>
              <div className="text-[10px] text-muted-foreground">
                লেসন শেষ হলে লক্ষ্যের অগ্রগতি নিজে থেকেই বাড়বে
              </div>
            </div>
            <Switch checked={linkGoal} onCheckedChange={setLinkGoal} aria-label="লক্ষ্য লিংক" />
          </div>
        </div>

        <motion.div layout>
          <Button
            onClick={submit}
            disabled={create.isPending || effectiveTitle.length < 2}
            className="w-full font-bold"
            size="lg"
          >
            {create.isPending ? "তৈরি হচ্ছে…" : "শেখা শুরু করুন"}
          </Button>
        </motion.div>
      </div>
    </ResponsiveModal>
  );
}
