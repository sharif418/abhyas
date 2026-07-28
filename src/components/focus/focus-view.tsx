"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain, Check, Flame } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useHabits } from "@/hooks/use-habits";
import { toBn } from "@/lib/date-bn";
import { fireConfetti } from "@/lib/confetti";
import { ProgressRing } from "@/components/shared/progress-ring";
import { IconTile } from "@/components/shared/icon-renderer";
import { FocusDailyChart } from "@/components/focus/focus-daily-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TimerMode = "work" | "break";
type TimerState = "idle" | "running" | "paused" | "done";

const PRESETS = [
  { label: "পোমোডোরো", work: 25, break: 5 },
  { label: "গভীর কাজ", work: 50, break: 10 },
  { label: "ছোট", work: 15, break: 3 },
];

// Custom interval state key for localStorage
const CUSTOM_KEY = "abhyas-focus-custom";

interface FocusData {
  sessions: any[];
  todayMinutes: number;
  totalMinutes: number;
  totalSessions: number;
  dailySeries: { date: string; minutes: number }[];
  focusStreak: number;
}

export function FocusView() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [mode, setMode] = useState<TimerMode>("work");
  const [state, setState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].work * 60);
  const [selectedHabitId, setSelectedHabitId] = useState<string>("none");
  const [sessionTag, setSessionTag] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [customWork, setCustomWork] = useState(30);
  const [customBreak, setCustomBreak] = useState(5);
  const [showCustom, setShowCustom] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load custom interval from localStorage
  useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_KEY);
      if (saved) {
        const { work, brk } = JSON.parse(saved);
        if (work > 0 && brk >= 0) {
          setCustomWork(work);
          setCustomBreak(brk);
        }
      }
    } catch {}
  });

  const isCustom = presetIdx === -1;
  const preset = isCustom
    ? { label: "কাস্টম", work: customWork, break: customBreak }
    : PRESETS[presetIdx];
  const totalSeconds = (mode === "work" ? preset.work : preset.break) * 60;
  const qc = useQueryClient();
  const { data: habits } = useHabits();
  const { data: focusData, isLoading } = useQuery<FocusData>({
    queryKey: ["focus"],
    queryFn: () => api.get<FocusData>("/api/focus?days=7"),
  });

  const logSession = useMutation({
    mutationFn: (input: { durationMin: number; type: TimerMode; habitId?: string | null; tag?: string | null }) =>
      api.post<{
        xpAwarded: number;
        totalXp: number;
        level: number;
        leveledUp: boolean;
      }>("/api/focus", input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["focus"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      if (res.xpAwarded > 0) {
        if (res.leveledUp) {
          toast.success(`⭐ লেভেল আপ! এখন লেভেল ${toBn(res.level)}`, {
            description: `+${toBn(res.xpAwarded)} XP অর্জন`,
          });
        } else {
          toast.success(`+${toBn(res.xpAwarded)} XP`, {
            description: `${toBn(res.xpAwarded / 2)} মিনিট ফোকাস`,
          });
        }
      }
    },
  });

  const handleComplete = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("done");
    // log the session (XP toast handled by mutation onSuccess)
    const durationMin = mode === "work" ? preset.work : preset.break;
    logSession.mutate({
      durationMin,
      type: mode,
      habitId: selectedHabitId !== "none" ? selectedHabitId : null,
      tag: sessionTag.trim() || null,
    });
    // Clear tag after session
    if (mode === "work") setSessionTag("");
    if (mode === "work") {
      setCompletedCount((c) => c + 1);
      fireConfetti({ count: 60, duration: 600 });
    }
    // auto-switch mode
    setTimeout(() => {
      const nextMode: TimerMode = mode === "work" ? "break" : "work";
      setMode(nextMode);
      setSecondsLeft((nextMode === "work" ? preset.work : preset.break) * 60);
      setState("idle");
    }, 1500);
  }, [mode, preset, logSession, selectedHabitId, sessionTag]);

  // timer tick
  useEffect(() => {
    if (state !== "running") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // session complete
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state, mode, handleComplete]);

  const start = () => {
    setState("running");
  };
  const pause = () => {
    setState("paused");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const reset = () => {
    setState("idle");
    setSecondsLeft(totalSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const switchPreset = (idx: number) => {
    setPresetIdx(idx);
    setMode("work");
    const p = idx === -1
      ? { work: customWork, break: customBreak }
      : PRESETS[idx];
    setSecondsLeft(p.work * 60);
    setState("idle");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const applyCustom = () => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify({ work: customWork, brk: customBreak }));
    } catch {}
    setPresetIdx(-1);
    setMode("work");
    setSecondsLeft(customWork * 60);
    setState("idle");
    setShowCustom(false);
  };

  const switchMode = (m: TimerMode) => {
    if (state === "running") return;
    setMode(m);
    setSecondsLeft((m === "work" ? preset.work : preset.break) * 60);
    setState("idle");
  };

  const progress = 1 - secondsLeft / totalSeconds;
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">ফোকাস মোড</h1>
        <p className="text-xs text-muted-foreground">
          পোমোডোরো টেকনিকে দিয়ে গভীর কাজ করুন
        </p>
      </div>

      {/* Preset selector */}
      <div className="flex gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => switchPreset(i)}
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
          onClick={() => setShowCustom(true)}
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
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-3xl border bg-card p-4 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-bold">কাস্টম সময় নির্ধারণ করুন</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                কাজের সময় (মিনিট)
              </label>
              <Input
                type="number"
                min={1}
                max={180}
                value={customWork}
                onChange={(e) => setCustomWork(Math.max(1, Math.min(180, Number(e.target.value))))}
                className="h-10"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                বিশ্রামের সময় (মিনিট)
              </label>
              <Input
                type="number"
                min={0}
                max={60}
                value={customBreak}
                onChange={(e) => setCustomBreak(Math.max(0, Math.min(60, Number(e.target.value))))}
                className="h-10"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={applyCustom} size="sm" className="flex-1">
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
        </motion.div>
      )}

      {/* Timer */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm"
      >
        <div
          className={cn(
            "absolute inset-0 opacity-30 transition-opacity",
            mode === "work" ? "bg-primary/5" : "bg-amber-500/5"
          )}
        />

        <div className="relative flex flex-col items-center">
          {/* Mode toggle */}
          <div className="mb-4 flex gap-1 rounded-full bg-muted/50 p-1">
            <button
              onClick={() => switchMode("work")}
              disabled={state === "running"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50",
                mode === "work" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <Brain size={13} /> কাজ
            </button>
            <button
              onClick={() => switchMode("break")}
              disabled={state === "running"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50",
                mode === "break" ? "bg-amber-500 text-white" : "text-muted-foreground"
              )}
            >
              <Coffee size={13} /> বিশ্রাম
            </button>
          </div>

          {/* Circular timer */}
          <ProgressRing
            value={progress}
            size={200}
            stroke={12}
            color={mode === "work" ? "var(--primary)" : "var(--streak)"}
            showGlow={state === "running"}
          >
            <div className="text-center">
              <div className="tabular text-4xl font-extrabold">
                {toBn(mm)}:{toBn(String(ss).padStart(2, "0"))}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {mode === "work" ? "কাজের সময়" : "বিশ্রাম"}
              </div>
              {completedCount > 0 && (
                <div className="mt-1 text-[9px] font-medium text-primary">
                  আজ {toBn(completedCount)} টি সেশন ✓
                </div>
              )}
            </div>
          </ProgressRing>

          {/* Controls */}
          <div className="mt-5 flex gap-3">
            {state === "idle" || state === "paused" ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={start}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                aria-label="শুরু"
              >
                <Play size={24} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={pause}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg"
                aria-label="বিরতি"
              >
                <Pause size={24} fill="currentColor" />
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="flex h-14 w-14 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm"
              aria-label="রিসেট"
            >
              <RotateCcw size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Habit linking + session tag */}
      <div className="rounded-3xl border bg-card p-4 shadow-sm">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          কোন অভ্যাসের সাথে যুক্ত করবেন? (ঐচ্ছিক)
        </div>
        <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
          <SelectTrigger>
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
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            সেশন ট্যাগ (ঐচ্ছিক)
          </div>
          <Input
            value={sessionTag}
            onChange={(e) => setSessionTag(e.target.value)}
            placeholder="যেমন: পড়াশোনা, কোডিং, লেখা..."
            className="h-9 text-sm"
            maxLength={60}
          />
        </div>
      </div>

      {/* Today stats */}
      {isLoading ? (
        <Skeleton className="h-28 rounded-3xl" />
      ) : (
        focusData && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="আজ"
              value={focusData.todayMinutes}
              unit="মিনিট"
              color="var(--primary)"
            />
            <StatBox
              label="এই সপ্তাহ"
              value={focusData.totalMinutes}
              unit="মিনিট"
              color="var(--streak)"
            />
            <StatBox
              label="সেশন"
              value={focusData.totalSessions}
              unit="টি"
              color="#7c3aed"
            />
            <StatBox
              label="স্ট্রিক"
              value={focusData.focusStreak}
              unit="দিন"
              color="var(--streak)"
              icon="flame"
            />
          </div>
        )
      )}

      {/* Daily focus chart */}
      {focusData && focusData.dailySeries && (
        <FocusDailyChart data={focusData.dailySeries} />
      )}

      {/* Recent sessions */}
      {focusData && focusData.sessions.length > 0 && (
        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold">সাম্প্রতিক সেশন</h3>
          <div className="space-y-1.5">
            {focusData.sessions.slice(0, 8).map((s) => {
              const habit = habits?.find((h) => h.id === s.habitId);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/30 p-2"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      s.type === "work"
                        ? "bg-primary/15 text-primary"
                        : "bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {s.type === "work" ? <Brain size={14} /> : <Coffee size={14} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">
                        {toBn(s.durationMin)} মিনিট {s.type === "work" ? "কাজ" : "বিশ্রাম"}
                      </span>
                      {s.tag && (
                        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-medium text-violet-600 dark:text-violet-400">
                          #{s.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {habit ? habit.name : "সাধারণ"} • {s.date}
                    </div>
                  </div>
                  <Check size={14} className="text-emerald-500" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon?: "flame";
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center">
      <div
        className="flex items-center justify-center gap-1 tabular text-xl font-extrabold leading-none"
        style={{ color }}
      >
        {icon === "flame" && value > 0 && (
          <Flame size={14} fill="currentColor" className="streak-glow" />
        )}
        {toBn(value)}
      </div>
      <div className="text-[9px] text-muted-foreground">{unit}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
