"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocial } from "@/hooks/use-social";
import {
  SocialConnectionStatus,
  SocialReconnectBanner,
} from "@/components/social/social-connection-status";
import {
  SocialLeaderboard,
  type SocialMe,
} from "@/components/social/social-leaderboard";
import { SocialActivityFeed } from "@/components/social/social-activity-feed";
import type { Habit } from "@/types";

/**
 * Social view shell — composes the connection status pill, the real
 * database-backed leaderboard, the live activity feed and the reconnect
 * banner. Every entry is a real registered app user (DB truth); presence
 * and activities are live real people. Zero demo data in the chain.
 */
export function SocialView() {
  const { data: me } = useQuery<SocialMe>({
    queryKey: ["me"],
    queryFn: () => api.get<SocialMe>("/api/me"),
  });

  // Real best streak from the user's own habits (shared cache with Home).
  const { data: habits } = useQuery<Habit[]>({
    queryKey: ["habits"],
    queryFn: () => api.get<Habit[]>("/api/habits"),
  });
  const bestStreak = useMemo(
    () => habits?.reduce((max, h) => Math.max(max, h.bestStreak ?? 0), 0) ?? 0,
    [habits]
  );

  // Guest = not logged in (shared "অতিথি" identity) — they can watch the
  // board and the feed, but they don't compete until they register.
  const isGuest = !me || me.id === "local-default-user";

  const {
    connectionState,
    connected,
    leaderboard,
    activities,
    onlineCount,
    reconnect,
  } = useSocial({
    userId: me?.id,
    name: me?.name,
    xp: me?.xp,
    level: me?.level,
    bestStreak,
  });

  const isLoading = connectionState === "connecting" && leaderboard.length === 0;
  const hasError = connectionState === "error";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">সোশ্যাল</h1>
          <p className="text-xs text-muted-foreground">
            বিশ্বব্যাপী ব্যবহারকারীদের সাথে প্রতিযোগিতা
          </p>
        </div>
        <SocialConnectionStatus
          connectionState={connectionState}
          connected={connected}
          onlineCount={onlineCount}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Real leaderboard (database-backed) */}
        <SocialLeaderboard
          me={me}
          isGuest={isGuest}
          leaderboard={leaderboard}
          isLoading={isLoading}
        />

        {/* Live activity feed (real events only) */}
        <SocialActivityFeed activities={activities} connected={connected} />
      </div>

      {/* Error banner with retry */}
      <SocialReconnectBanner show={hasError} onReconnect={reconnect} />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-center text-xs text-muted-foreground">
        {isGuest
          ? "লিডারবোর্ডে অংশ নিতে একটি অ্যাকাউন্ট খুলুন — সম্পূর্ণ বিনামূল্যে।"
          : "অন্যদের সাথে একসাথে অগ্রগতি করুন। প্রতিদিন অভ্যাস সম্পন্ন করে লিডারবোর্ডে উপরে উঠুন!"}
      </div>
    </div>
  );
}
