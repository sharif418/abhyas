"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Flame, Loader2, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/stat-pill";
import type { LeaderboardEntry } from "@/hooks/use-social";

export interface SocialMe {
  name: string;
  xp: number;
  level: number;
}

const INVITE_TEXT =
  "আমি অভ্যাস অ্যাপ ব্যবহার করে প্রতিদিন অভ্যাস ও ইবাদত ট্র্যাক করছি। আপনিও যুক্ত হন — লিডারবোর্ডে দেখা হবে!";

/**
 * Invite friends via the Web Share API; falls back to clipboard copy
 * with a sonner toast on browsers without share support.
 */
async function handleInvite(): Promise<void> {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "অভ্যাস", text: INVITE_TEXT, url });
      return;
    }
    await navigator.clipboard.writeText(`${INVITE_TEXT}\n${url}`);
    toast.success("লিংক কপি হয়েছে", {
      description: "বন্ধুদের সাথে শেয়ার করুন",
    });
  } catch (err) {
    // navigator.share throws AbortError when the user dismisses the sheet.
    if ((err as DOMException)?.name === "AbortError") return;
    toast.error("শেয়ার করা যায়নি", { description: "আবার চেষ্টা করুন" });
  }
}

/**
 * Live leaderboard — rank hero + ranked list. When nobody else is on the
 * board yet (only you / nobody), an honest empty state invites friends.
 */
export function SocialLeaderboard({
  me,
  leaderboard,
  isLoading,
}: {
  me?: SocialMe;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
}) {
  const myRank = useMemo(() => {
    const idx = leaderboard.findIndex((e) => e.isYou);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard]);

  // "Empty" means no OTHER participants — a board with only you is still
  // friendless, so the invite empty state applies.
  const hasFriends = useMemo(
    () => leaderboard.some((e) => !e.isYou),
    [leaderboard]
  );

  return (
    <div className="space-y-4">
      {/* Your rank hero — only when live data includes you */}
      <AnimatePresence mode="wait">
        {me && leaderboard.length > 0 && (
          <motion.div
            key="rank-hero"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <span className="tabular text-lg font-extrabold leading-none">
                  {myRank ? toBn(myRank) : "—"}
                </span>
                <span className="text-[8px]">র‍্যাঙ্ক</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{me.name}</div>
                <div className="text-xs text-muted-foreground">
                  লেভেল {toBn(me.level)} • {toBn(me.xp)} XP
                </div>
              </div>
              {myRank && myRank <= 3 && (
                <Crown className="text-amber-500" size={24} fill="currentColor" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard list */}
      <div className="rounded-3xl border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Trophy size={15} className="text-amber-500" aria-hidden />
            লিডারবোর্ড
          </div>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {hasFriends &&
              leaderboard.map((entry, i) => (
                <motion.div
                  layout
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-2 transition-colors",
                    entry.isYou
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "hover:bg-muted/40"
                  )}
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        entry.isYou
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {entry.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">
                          {entry.name}
                        </span>
                        {entry.isYou && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                            আপনি
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="tabular">{toBn(entry.xp)} XP</span>
                        {entry.bestStreak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-streak">
                            <Flame size={9} fill="currentColor" aria-hidden />
                            {toBn(entry.bestStreak)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular text-xs font-bold">
                      লেভেল {toBn(entry.level)}
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Loading skeleton — initial connect, no data yet */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1 py-1"
                role="status"
                aria-live="polite"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl p-2"
                  >
                    <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-2 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" aria-hidden />
                  সংযোগ হচ্ছে...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state — nobody (or only you) on the board */}
          {!isLoading && !hasFriends && (
            <EmptyState
              icon="Users"
              title="এখনো কোনো বন্ধু অনলাইন নেই"
              description="আপনার বন্ধুরাও অভ্যাস অ্যাপ ব্যবহার করলে এখানে লিডারবোর্ডে দেখা যাবে।"
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleInvite()}
                  className="gap-1.5"
                >
                  <Share2 size={13} aria-hidden />
                  বন্ধুদের আমন্ত্রণ জানান
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-amber-400 text-amber-950 shadow-md"
      : rank === 2
      ? "bg-slate-300 text-slate-800"
      : rank === 3
      ? "bg-orange-400 text-orange-950"
      : "bg-muted text-muted-foreground";
  return (
    <div
      className={cn(
        "tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        style
      )}
      aria-label={`র‍্যাঙ্ক ${toBn(rank)}`}
    >
      {toBn(rank)}
    </div>
  );
}
