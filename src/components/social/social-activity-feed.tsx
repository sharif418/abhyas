"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/icon-renderer";
import type { ActivityEvent } from "@/hooks/use-social";

/**
 * Live activity feed — real events streamed over the social socket.
 * Honest empty state when nothing is happening yet.
 */
export function SocialActivityFeed({
  activities,
  connected,
}: {
  activities: ActivityEvent[];
  connected: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={15} className="text-primary" aria-hidden />
          <span className="text-sm font-bold">লাইভ কার্যকলাপ</span>
        </div>
        <span className="flex h-2 w-2" aria-hidden>
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "animate-pulse bg-primary" : "bg-muted-foreground"
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
            {connected
              ? "এখনো কোনো লাইভ কার্যকলাপ নেই। কেউ অভ্যাস সম্পন্ন করলেই এখানে দেখা যাবে।"
              : "সংযোগ ছিন্ন — সংযোগ ফিরলে লাইভ কার্যকলাপ দেখা যাবে।"}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
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
        <p className="text-xs leading-snug">{formatActivity(event)}</p>
        <span className="text-[9px] text-muted-foreground">
          {timeAgo(event.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

/** Render the event sentence as rich React nodes (bold user names). */
function formatActivity(e: ActivityEvent): ReactNode {
  switch (e.type) {
    case "completion":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> «
          {e.habitName}» সম্পন্ন করেছেন
          {e.streak ? ` (${toBn(e.streak)} দিন)` : ""}
        </>
      );
    case "streak":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> এর «
          {e.habitName}» এ {toBn(e.streak || 0)} দিনের স্ট্রিক!
        </>
      );
    case "levelup":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> লেভেল {toBn(e.level || 0)} এ উন্নীত হয়েছেন!
        </>
      );
    case "join":
      return (
        <>
          <span className="font-semibold">{e.userName}</span> যুক্ত হয়েছেন
        </>
      );
    default:
      return "";
  }
}

function ActivityIcon({ type }: { type: ActivityEvent["type"] }) {
  const icons: Record<string, { icon: string; color: string; bg: string }> = {
    completion: { icon: "CheckCircle2", color: "text-primary", bg: "bg-primary/10" },
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
