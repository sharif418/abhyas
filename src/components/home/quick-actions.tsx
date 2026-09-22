"use client";

import { motion } from "framer-motion";
import { BookOpen, CalendarCheck, Moon, Target, Timer } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { key: "planner", label: "পরিকল্পনা", icon: CalendarCheck, className: "bg-primary/10 text-primary" },
  { key: "islamic", label: "নামাজ", icon: Moon, className: "bg-islamic/10 text-islamic" },
  { key: "islamic", label: "তাসবিহ", icon: BookOpen, className: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  { key: "focus", label: "ফোকাস", icon: Timer, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { key: "goals", label: "লক্ষ্য", icon: Target, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
] as const;

/**
 * QuickActions — the one-tap jump grid under the hero card. The five things
 * people open the app for mid-day, no scrolling needed.
 */
export function QuickActions() {
  const setView = useUIStore((s) => s.setView);

  return (
    <nav aria-label="দ্রুত কাজ" className="grid grid-cols-5 gap-2">
      {ACTIONS.map((a, i) => (
        <motion.button
          key={a.label}
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          onClick={() => setView(a.key)}
          className={cn(
            "focus-visible:ring-ring/70 group flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2.5 shadow-sm transition-all",
            "hover:-translate-y-0.5 hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
          )}
          aria-label={`${a.label} খুলুন`}
        >
          <span className={cn("flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105", a.className)}>
            <a.icon size={20} aria-hidden />
          </span>
          <span className="text-[11px] font-semibold">{a.label}</span>
        </motion.button>
      ))}
    </nav>
  );
}
