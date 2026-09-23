"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFocusDndStore } from "@/stores/focus-dnd-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HabitLite {
  id: string;
  name: string;
}

/** Built-in work/break intervals (minutes). Custom values are user-defined. */
export const FOCUS_PRESETS = [
  { label: "পোমোডোরো", work: 25, break: 5 },
  { label: "গভীর কাজ", work: 50, break: 10 },
  { label: "ছোট", work: 15, break: 3 },
];

/* ------------------------------------------------------------------ */
/*  Work/break duration config — preset bar + custom interval picker   */
/* ------------------------------------------------------------------ */

interface FocusPresetConfigProps {
  /** Active preset index, or -1 when the custom interval is active. */
  presetIdx: number;
  /** Last-applied custom minutes (shown on the কাস্টম chip). */
  customWork: number;
  customBreak: number;
  onSwitchPreset: (idx: number) => void;
  onApplyCustom: (work: number, brk: number) => void;
}

export function FocusPresetConfig({
  presetIdx,
  customWork,
  customBreak,
  onSwitchPreset,
  onApplyCustom,
}: FocusPresetConfigProps) {
  const [showCustom, setShowCustom] = useState(false);
  // Drafts live locally — বাতিল discards edits, প্রয়োগ commits them.
  const [workDraft, setWorkDraft] = useState(customWork);
  const [breakDraft, setBreakDraft] = useState(customBreak);

  const isCustom = presetIdx === -1;

  const openCustom = () => {
    setWorkDraft(customWork);
    setBreakDraft(customBreak);
    setShowCustom(true);
  };

  const apply = () => {
    onApplyCustom(workDraft, breakDraft);
    setShowCustom(false);
  };

  return (
    <div className="space-y-3">
      {/* Preset selector */}
      <div className="flex gap-2" role="group" aria-label="ফোকাস প্রিসেট">
        {FOCUS_PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSwitchPreset(i)}
            aria-pressed={presetIdx === i}
            className={cn(
              "flex-1 rounded-2xl border px-3 py-2 text-center text-xs font-medium transition",
              presetIdx === i
                ? "border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:border-foreground/20"
            )}
          >
            <div className="font-bold">{p.label}</div>
            <div className="text-[10px]">
              {toBn(p.work)}মি কাজ / {toBn(p.break)}মি বিশ্রাম
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={openCustom}
          aria-pressed={isCustom}
          className={cn(
            "flex-1 rounded-2xl border px-3 py-2 text-center text-xs font-medium transition",
            isCustom
              ? "border-primary bg-primary/5 text-primary"
              : "text-muted-foreground hover:border-foreground/20"
          )}
        >
          <div className="font-bold">কাস্টম</div>
          <div className="text-[10px]">
            {isCustom
              ? `${toBn(customWork)}মি / ${toBn(customBreak)}মি`
              : "নিজের সময়"}
          </div>
        </button>
      </div>

      {/* Custom interval picker */}
      <AnimatePresence initial={false}>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold">কাস্টম সময় নির্ধারণ করুন</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="focus-custom-work"
                    className="mb-1 block text-[11px] font-medium text-muted-foreground"
                  >
                    কাজের সময় (মিনিট)
                  </label>
                  <Input
                    id="focus-custom-work"
                    type="number"
                    min={1}
                    max={180}
                    value={workDraft}
                    onChange={(e) =>
                      setWorkDraft(Math.max(1, Math.min(180, Number(e.target.value) || 1)))
                    }
                    className="h-10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="focus-custom-break"
                    className="mb-1 block text-[11px] font-medium text-muted-foreground"
                  >
                    বিশ্রামের সময় (মিনিট)
                  </label>
                  <Input
                    id="focus-custom-break"
                    type="number"
                    min={0}
                    max={60}
                    value={breakDraft}
                    onChange={(e) =>
                      setBreakDraft(Math.max(0, Math.min(60, Number(e.target.value) || 0)))
                    }
                    className="h-10"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={apply} size="sm" className="flex-1">
                  প্রয়োগ করুন
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustom(false)}
                >
                  বাতিল
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ডিস্ট্রাকশন-ফ্রি ইবাদত — screen pin during focus (native only)      */
/* ------------------------------------------------------------------ */

/**
 * ScreenPinToggle — pins অভ্যাস' own activity while a native focus session
 * runs (Activity.startLockTask: no permission for self-pinning; exit any
 * time by holding Back + Recents). Hidden on web — a browser tab cannot be
 * pinned against the OS, and we never show a switch that does nothing.
 */
export function ScreenPinToggle() {
  const platform = useFocusDndStore((s) => s.platform);
  const screenPin = useFocusDndStore((s) => s.screenPin);
  const setScreenPin = useFocusDndStore((s) => s.setScreenPin);

  if (platform !== "android") return null;

  return (
    <div className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-sm">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
          screenPin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {screenPin ? <Pin className="size-5" aria-hidden /> : <PinOff className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">স্ক্রিন পিন (ডিস্ট্রাকশন-ফ্রি ইবাদত)</div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          ফোকাস চালু থাকা পর্যন্ত এই অ্যাপেই থাকবে — তিলাওয়াত/জিকিরে মন ভোলার সুযোগ থাকবে না।
          বের হতে চাইলে “ব্যাক + রিসেন্ট” বোতাম একসাথে চেপে ধরুন।
        </p>
      </div>
      <Switch
        checked={screenPin}
        onCheckedChange={setScreenPin}
        aria-label="স্ক্রিন পিন চালু/বন্ধ"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Session config — link a habit + free-form tag for the next session  */
/* ------------------------------------------------------------------ */

interface FocusSessionConfigProps {
  habits?: HabitLite[];
  selectedHabitId: string;
  onSelectHabit: (id: string) => void;
  sessionTag: string;
  onSessionTagChange: (tag: string) => void;
}

export function FocusSessionConfig({
  habits,
  selectedHabitId,
  onSelectHabit,
  sessionTag,
  onSessionTagChange,
}: FocusSessionConfigProps) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        কোন অভ্যাসের সাথে যুক্ত করবেন? (ঐচ্ছিক)
      </div>
      <Select value={selectedHabitId} onValueChange={onSelectHabit}>
        <SelectTrigger aria-label="অভ্যাস নির্বাচন করুন">
          <SelectValue placeholder="অভ্যাস নির্বাচন করুন" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">কোনোটিই নয়</SelectItem>
          {habits?.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-3">
        <label
          htmlFor="focus-session-tag"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          সেশন ট্যাগ (ঐচ্ছিক)
        </label>
        <Input
          id="focus-session-tag"
          value={sessionTag}
          onChange={(e) => onSessionTagChange(e.target.value)}
          placeholder="যেমন: পড়াশোনা, কোডিং, লেখা..."
          className="h-9 text-sm"
          maxLength={60}
        />
      </div>
    </div>
  );
}
