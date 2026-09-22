"use client";

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

/**
 * Social view shell — composes the connection status pill, the live
 * leaderboard, the activity feed and the reconnect banner. All data
 * comes from the social WebSocket mini-service (real users only).
 */
export function SocialView() {
  const { data: me } = useQuery<SocialMe>({
    queryKey: ["me"],
    queryFn: () => api.get<SocialMe>("/api/me"),
  });

  const {
    connectionState,
    connected,
    leaderboard,
    activities,
    onlineCount,
    reconnect,
  } = useSocial({
    name: me?.name,
    xp: me?.xp,
    level: me?.level,
    bestStreak: 0,
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
        {/* Leaderboard */}
        <SocialLeaderboard me={me} leaderboard={leaderboard} isLoading={isLoading} />

        {/* Activity feed */}
        <SocialActivityFeed activities={activities} connected={connected} />
      </div>

      {/* Error banner with retry */}
      <SocialReconnectBanner show={hasError} onReconnect={reconnect} />

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-center text-xs text-muted-foreground">
        অন্যদের সাথে একসাথে অগ্রগতি করুন। প্রতিদিন অভ্যাস সম্পন্ন করে লিডারবোর্ডে উপরে উঠুন!
      </div>
    </div>
  );
}
