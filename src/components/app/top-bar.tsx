"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { bnGreeting, bnDayFirst, toBn } from "@/lib/date-bn";
import { gamificationState, levelTitle } from "@/lib/gamification";
import { useUIStore } from "@/stores/ui-store";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";

interface MeResponse {
  name: string;
  xp: number;
  level: number;
  city: string;
}

/** Top bar: greeting + date + level ring + add button. */
export function TopBar() {
  const { data: me } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
    staleTime: 60_000,
  });
  const openAddHabit = useUIStore((s) => s.openAddHabit);

  const game = me ? gamificationState(me.xp) : null;

  return (
    <header className="sticky top-0 z-30 glass border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <motion.div
            key={me?.name ?? "guest"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold"
          >
            {bnGreeting()}, {me?.name ?? "অতিথি"}
          </motion.div>
          <div className="text-[11px] text-muted-foreground">
            {bnDayFirst()}
            {me?.city ? ` • ${me.city}` : ""}
          </div>
        </div>

        {game && (
          <button
            onClick={() => useUIStore.getState().setView("profile")}
            className="flex items-center gap-2 rounded-full border bg-card/70 py-1 pl-1 pr-3 shadow-sm transition hover:border-foreground/20"
            title={`লেভেল ${toBn(game.level)} • ${levelTitle(game.level)}`}
          >
            <ProgressRing
              value={game.progress}
              size={34}
              stroke={3}
              animate={false}
            >
              <span className="text-[10px] font-bold">{toBn(game.level)}</span>
            </ProgressRing>
            <div className="leading-tight">
              <div className="text-[10px] text-muted-foreground">XP</div>
              <div className="tabular text-xs font-bold">{toBn(me!.xp)}</div>
            </div>
          </button>
        )}

        <button
          onClick={openAddHabit}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition",
            "hover:scale-105 active:scale-95"
          )}
          aria-label="নতুন অভ্যাস যোগ করুন"
        >
          <Plus size={22} />
        </button>
      </div>
    </header>
  );
}
