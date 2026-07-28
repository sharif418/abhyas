"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { gamificationState } from "@/lib/gamification";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { useSocial, type ActivityEvent } from "@/hooks/use-social";
import { Crown, Flame, Trophy, Users, Wifi, WifiOff } from "lucide-react";
import { useMemo } from "react";

interface MeResponse {
  name: string;
  xp: number;
  level: number;
}

export function SocialView() {
  const { data: me } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
  });
  const game = me ? gamificationState(me.xp) : null;

  const { connected, leaderboard, activities, onlineCount } = useSocial({
    name: me?.name,
    xp: me?.xp,
    level: me?.level,
    bestStreak: 0,
  });

  // your rank
  const myRank = useMemo(() => {
    const idx = leaderboard.findIndex((e) => e.isYou);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">সোশ্যাল</h1>
          <p className="text-xs text-muted-foreground">
            বিশ্বব্যাপী ব্যবহারকারীদের সাথে প্রতিযোগিতা
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            connected
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? `${toBn(onlineCount)} জন অনলাইন` : "সংযোগ নেই"}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="space-y-4">
          {/* Your rank hero */}
          {me && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
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

          {/* Leaderboard list */}
          <div className="rounded-3xl border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-bold">
              <Trophy size={15} className="text-amber-500" />
              লিডারবোর্ড
            </div>
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, i) => (
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
                              <Flame size={9} fill="currentColor" />
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
              {leaderboard.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  লিডারবোর্ড লোড হচ্ছে...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users size={15} className="text-primary" />
              <span className="text-sm font-bold">লাইভ কার্যকলাপ</span>
            </div>
            <span className="flex h-2 w-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                )}
              />
            </span>
          </div>
          <div className="fancy-scroll max-h-[60vh] space-y-2 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {activities.map((event) => (
                <ActivityRow key={event.id} event={event} />
              ))}
            </AnimatePresence>
            {activities.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                এখনো কোনো কার্যকলাপ নেই। অভ্যাস সম্পন্ন করলে এখানে দেখা যাবে।
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-center text-xs text-muted-foreground">
        অন্যদের সাথে একসাথে অগ্রগতি করুন। প্রতিদিন অভ্যাস সম্পন্ন করে লিডারবোর্ডে উপরে উঠুন!
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
    >
      {toBn(rank)}
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const text = formatActivity(event);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex items-start gap-2.5 rounded-2xl bg-muted/30 p-2.5"
    >
      <div className="mt-0.5">
        <ActivityIcon type={event.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug">{text}</p>
        <span className="text-[9px] text-muted-foreground">
          {timeAgo(event.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function formatActivity(e: ActivityEvent): string {
  switch (e.type) {
    case "completion":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> «
          {e.habitName}» সম্পন্ন করেছেন
          {e.streak ? ` (${toBn(e.streak)} দিন)` : ""}
        </>
      ) as unknown as string;
    case "streak":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> এর «
          {e.habitName}» এ {toBn(e.streak || 0)} দিনের স্ট্রিক!
        </>
      ) as unknown as string;
    case "levelup":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> লেভেল {toBn(e.level || 0)} এ উন্নীত হয়েছেন!
        </>
      ) as unknown as string;
    case "join":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> যুক্ত হয়েছেন
        </>
      ) as unknown as string;
    default:
      return "";
  }
}

function ActivityIcon({ type }: { type: ActivityEvent["type"] }) {
  const icons: Record<string, { icon: string; color: string; bg: string }> = {
    completion: { icon: "CheckCircle2", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    streak: { icon: "Flame", color: "text-amber-500", bg: "bg-amber-500/10" },
    levelup: { icon: "Star", color: "text-violet-500", bg: "bg-violet-500/10" },
    join: { icon: "UserPlus", color: "text-sky-500", bg: "bg-sky-500/10" },
  };
  const cfg = icons[type] ?? icons.join;
  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cfg.bg}`}>
      <IconRenderer name={cfg.icon} size={14} className={cfg.color} />
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "এইমাত্র";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toBn(min)} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  return `${toBn(hr)} ঘণ্টা আগে`;
}
