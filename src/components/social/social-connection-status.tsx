"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toBn } from "@/lib/date-bn";
import { cn } from "@/lib/utils";
import type { SocialConnectionState } from "@/hooks/use-social";

/**
 * Connection status pill for the Social view header — online count,
 * connecting, or offline (real states only — no demo mode).
 */
export function SocialConnectionStatus({
  connectionState,
  connected,
  onlineCount,
}: {
  connectionState: SocialConnectionState;
  connected: boolean;
  onlineCount: number;
}) {
  const isError = connectionState === "error";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        isError
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : connected
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
      role="status"
      aria-live="polite"
    >
      {isError ? (
        <AlertCircle size={12} aria-hidden />
      ) : connected ? (
        <Wifi size={12} aria-hidden />
      ) : (
        <WifiOff size={12} aria-hidden />
      )}
      {isError
        ? "সংযোগ নেই"
        : connected
        ? `${toBn(onlineCount)} জন অনলাইন`
        : connectionState === "connecting"
        ? "সংযোগ হচ্ছে..."
        : "সংযোগ নেই"}
    </div>
  );
}

/**
 * Reconnect banner — shown when the social service is unreachable.
 * Offers a manual retry; the leaderboard/feed show their empty states.
 */
export function SocialReconnectBanner({
  show,
  onReconnect,
}: {
  show: boolean;
  onReconnect: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-center sm:flex-row sm:text-left"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertCircle size={18} aria-hidden />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
              সংযোগ স্থাপন করা যায়নি
            </div>
            <div className="text-xs text-muted-foreground">
              লাইভ সোশ্যাল সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে
              আবার চেষ্টা করুন।
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReconnect}
            className="shrink-0 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            <RefreshCw size={13} />
            আবার চেষ্টা করুন
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
