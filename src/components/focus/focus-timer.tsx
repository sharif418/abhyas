"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { fireConfetti } from "@/lib/confetti";
import { playCompletionSound, playLevelUpSound } from "@/lib/sounds";
import { useSettingsStore } from "@/stores/settings-store";
import { acquireWakeLock, releaseWakeLock } from "@/lib/ibadah";
import { ProgressRing } from "@/components/shared/progress-ring";
import {
  FocusPresetConfig,
  FocusSessionConfig,
  FOCUS_PRESETS,
} from "@/components/focus/focus-settings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TimerMode = "work" | "break";
type TimerState = "idle" | "running" | "paused" | "done";

interface HabitLite {
  id: string;
  name: string;
}

// localStorage key for the persisted custom interval.
const CUSTOM_KEY = "abhyas-focus-custom";

/**
 * Read the persisted custom interval. Pure read (safe during SSR — falls
 * back to defaults), used as a lazy state initializer so no other setter
 * is invoked during initialization.
 */
function loadCustomInterval(): { work: number; brk: number } {
  try {
    const saved = localStorage.getItem(CUSTOM_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { work?: unknown; brk?: unknown };
      const work = Number(parsed.work);
      const brk = Number(parsed.brk);
      if (Number.isFinite(work) && work > 0 && Number.isFinite(brk) && brk >= 0) {
        return { work: Math.round(work), brk: Math.round(brk) };
      }
    }
  } catch {
    /* corrupt entry / no localStorage — defaults below */
  }
  return { work: 30, brk: 5 };
}

/** Tab-title template while a session runs (Bengali digits). */
function countdownTitle(secondsLeft: number): string {
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  return `${toBn(mm)}:${toBn(String(ss).padStart(2, "0"))} — ফোকাস | অভ্যাস`;
}

/**
 * FocusTimer — the pomodoro engine + dial UI.
 * Owns all timer state (mode / running / secondsLeft / preset), logs
 * completed sessions to /api/focus, keeps the screen awake (Wake Lock)
 * and mirrors the countdown into document.title while running.
 */
export function FocusTimer({ habits }: { habits?: HabitLite[] }) {
  const [presetIdx, setPresetIdx] = useState(0);
  const [mode, setMode] = useState<TimerMode>("work");
  const [state, setState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_PRESETS[0].work * 60);
  const [selectedHabitId, setSelectedHabitId] = useState("none");
  const [sessionTag, setSessionTag] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  // Lazy-init the custom interval from localStorage (no side-effecting
  // setters inside the initializer — the old useState(() => {...}) hack).
  const [initialCustom] = useState(loadCustomInterval);
  const [customWork, setCustomWork] = useState(initialCustom.work);
  const [customBreak, setCustomBreak] = useState(initialCustom.brk);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCustom = presetIdx === -1;
  const preset = isCustom
    ? { label: "কাস্টম", work: customWork, break: customBreak }
    : FOCUS_PRESETS[presetIdx];
  const totalSeconds = (mode === "work" ? preset.work : preset.break) * 60;

  const qc = useQueryClient();

  const logSession = useMutation({
    mutationFn: (input: {
      durationMin: number;
      type: TimerMode;
      habitId?: string | null;
      tag?: string | null;
    }) =>
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
          toast.success(`লেভেল আপ! এখন লেভেল ${toBn(res.level)}`, {
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
    if (mode === "work") {
      // Clear tag after the work session and celebrate.
      setSessionTag("");
      setCompletedCount((c) => c + 1);
      fireConfetti({ count: 60, duration: 600 });
      const soundEnabled = useSettingsStore.getState().sound;
      if (soundEnabled) playCompletionSound();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("ফোকাস সেশন সম্পন্ন!", {
          body: "বিশ্রামের সময়। কিছুক্ষণ বিশ্রাম নিন।",
          icon: "/icon.svg",
          tag: "abhyas-focus-complete",
        });
      }
    } else {
      // Break complete — gentle level-up sound.
      const soundEnabled = useSettingsStore.getState().sound;
      if (soundEnabled) playLevelUpSound();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("বিশ্রাম শেষ!", {
          body: "আবার কাজে ফিরে যাওয়ার সময়।",
          icon: "/icon.svg",
          tag: "abhyas-focus-break-done",
        });
      }
    }
    // auto-switch mode
    setTimeout(() => {
      const nextMode: TimerMode = mode === "work" ? "break" : "work";
      setMode(nextMode);
      setSecondsLeft((nextMode === "work" ? preset.work : preset.break) * 60);
      setState("idle");
    }, 1500);
  }, [mode, preset, logSession, selectedHabitId, sessionTag]);

  // timer tick — pure decrement via ref; completion fires from the interval
  // callback (an external-system subscription, not a synchronous effect body).
  const secondsRef = useRef(secondsLeft);
  useEffect(() => {
    secondsRef.current = secondsLeft;
  }, [secondsLeft]);
  const handleCompleteRef = useRef(handleComplete);
  useEffect(() => {
    handleCompleteRef.current = handleComplete;
  }, [handleComplete]);

  useEffect(() => {
    if (state !== "running") return;
    intervalRef.current = setInterval(() => {
      const next = Math.max(0, secondsRef.current - 1);
      secondsRef.current = next;
      setSecondsLeft(next);
      if (next === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleCompleteRef.current();
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  // Keep the screen awake while a session runs (released on pause/stop).
  useEffect(() => {
    if (state !== "running") return;
    void acquireWakeLock();
    return () => releaseWakeLock();
  }, [state]);

  // Live countdown in the browser tab while running; restored on stop.
  const originalTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (state === "running") {
      if (originalTitleRef.current === null) {
        originalTitleRef.current = document.title;
      }
      document.title = countdownTitle(secondsLeft);
    } else if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, [state, secondsLeft]);

  // Unmount safety — restore the tab title even if we unmount mid-session.
  useEffect(
    () => () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
    },
    []
  );

  const start = () => setState("running");
  const pause = () => setState("paused");
  const reset = () => {
    setState("idle");
    setSecondsLeft(totalSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const switchPreset = useCallback(
    (idx: number) => {
      setPresetIdx(idx);
      setMode("work");
      const p = idx === -1
        ? { work: customWork, break: customBreak }
        : FOCUS_PRESETS[idx];
      setSecondsLeft(p.work * 60);
      setState("idle");
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [customWork, customBreak]
  );

  const applyCustom = useCallback((work: number, brk: number) => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify({ work, brk }));
    } catch {
      /* storage unavailable (private mode) — keep the value session-only */
    }
    setCustomWork(work);
    setCustomBreak(brk);
    setPresetIdx(-1);
    setMode("work");
    setSecondsLeft(work * 60);
    setState("idle");
  }, []);

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
    <>
      {/* Work/break duration config */}
      <FocusPresetConfig
        presetIdx={presetIdx}
        customWork={customWork}
        customBreak={customBreak}
        onSwitchPreset={switchPreset}
        onApplyCustom={applyCustom}
      />

      {/* Timer dial */}
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
              type="button"
              onClick={() => switchMode("work")}
              disabled={state === "running"}
              aria-pressed={mode === "work"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50",
                mode === "work"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Brain size={13} /> কাজ
            </button>
            <button
              type="button"
              onClick={() => switchMode("break")}
              disabled={state === "running"}
              aria-pressed={mode === "break"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50",
                mode === "break"
                  ? "bg-amber-500 text-white dark:bg-amber-600 dark:text-amber-50"
                  : "text-muted-foreground"
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
                aria-label="শুরু"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
              >
                <Play size={24} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={pause}
                aria-label="বিরতি"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg dark:bg-amber-600 dark:text-amber-50"
              >
                <Pause size={24} fill="currentColor" />
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              aria-label="রিসেট"
              className="flex h-14 w-14 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm"
            >
              <RotateCcw size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Habit linking + session tag */}
      <FocusSessionConfig
        habits={habits}
        selectedHabitId={selectedHabitId}
        onSelectHabit={setSelectedHabitId}
        sessionTag={sessionTag}
        onSessionTagChange={setSessionTag}
      />
    </>
  );
}
