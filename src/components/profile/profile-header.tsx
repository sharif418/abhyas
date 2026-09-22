"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { toBn } from "@/lib/date-bn";
import { gamificationState, levelTitle } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/shared/progress-ring";
import { cn } from "@/lib/utils";
import { FOCUS_RING, type MeResponse } from "./profile-shared";

/**
 * Profile hero card — level ring, name (inline editor), level title and
 * XP/city meta. Shows skeletons while the `me` query loads so the name never
 * flashes "অতিথি" for real users (audit fix #2).
 */
export function ProfileHeaderCard({
  me,
  isLoading,
}: {
  me?: MeResponse;
  isLoading: boolean;
}) {
  const game = me ? gamificationState(me.xp) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      {isLoading ? (
        <div className="relative flex items-center gap-4">
          <Skeleton className="size-[84px] rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-4">
          {game && (
            <ProgressRing value={game.progress} size={84} stroke={8} showGlow>
              <div className="text-center">
                <div className="tabular text-xl font-extrabold">{toBn(game.level)}</div>
                <div className="text-[9px] text-muted-foreground">লেভেল</div>
              </div>
            </ProgressRing>
          )}
          <div className="min-w-0 flex-1">
            <NameEditor name={me?.name ?? "অতিথি"} />
            <div className="mt-0.5 text-sm text-muted-foreground">
              {me ? levelTitle(me.level) : ""}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="tabular">{toBn(me?.xp ?? 0)} XP</span>
              <span>•</span>
              <span>{me?.city}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * NameEditor — inline name editing with:
 *  - বাতিল (cancel) button + Escape key to revert (audit fix #3)
 *  - sonner error toast on failure (the old silent `.catch(() => {})` is gone)
 *  - focus-visible ring on the display button (audit fix #5)
 */
function NameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (n: string) => api.put("/api/me", { name: n }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("নাম সংরক্ষিত হয়েছে");
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "নাম সংরক্ষণ করা যায়নি");
    },
  });

  const cancel = () => {
    setValue(name);
    setEditing(false);
  };

  if (editing) {
    const trimmed = value.trim();
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 max-w-[180px] text-base font-bold"
          autoFocus
          maxLength={60}
          aria-label="আপনার নাম"
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed) save.mutate(trimmed);
            if (e.key === "Escape") cancel();
          }}
        />
        <Button
          size="sm"
          onClick={() => save.mutate(trimmed)}
          disabled={!trimmed || save.isPending}
          aria-label="নাম সংরক্ষণ করুন"
        >
          {save.isPending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <Check size={14} aria-hidden />
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel}>
          বাতিল
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className={cn("flex items-center gap-1.5 rounded-lg text-left", FOCUS_RING)}
    >
      <span className="truncate text-lg font-bold">{name}</span>
      <Pencil size={13} className="text-muted-foreground" aria-hidden />
    </button>
  );
}
