"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

export interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  level: number;
  bestStreak: number;
  isYou?: boolean;
}

export interface ActivityEvent {
  id: string;
  userName: string;
  type: "completion" | "streak" | "levelup" | "join";
  habitName?: string;
  streak?: number;
  level?: number;
  timestamp: number;
}

/**
 * Connection lifecycle states for the social socket.
 * - `connecting` — socket is attempting to establish / re-establish a connection
 * - `connected`  — socket is live; leaderboard + activity events are streaming
 * - `error`      — the initial-connection timeout (5s) elapsed, or all reconnect
 *                  attempts were exhausted. UI should fall back to demo mode.
 */
export type SocialConnectionState = "connecting" | "connected" | "error";

/** Milliseconds to wait for the initial WebSocket handshake before giving up. */
const CONNECT_TIMEOUT_MS = 5000;

/**
 * useSocial — connects to the social WebSocket mini-service (port 3003).
 * Returns live leaderboard + activity feed + a function to broadcast the
 * current user's activity.
 *
 * The hook tracks a finite-state connection lifecycle so the UI can show a
 * proper loading skeleton, fall back to demo data on failure, and let the
 * user manually retry via `reconnect()`.
 */
export function useSocial(opts?: {
  name?: string;
  xp?: number;
  level?: number;
  bestStreak?: number;
}) {
  const [connectionState, setConnectionState] =
    useState<SocialConnectionState>("connecting");
  const [connected, setConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const qc = useQueryClient();

  // Bumping this nonce tears down + re-creates the socket (manual retry).
  const [reconnectNonce, setReconnectNonce] = useState(0);

  // Reset connection state when the reconnect nonce changes (manual retry).
  // This uses the canonical "adjust state when a value changes" pattern
  // (calling setState during render is fine; in an effect body it triggers
  // cascading renders — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [prevReconnectNonce, setPrevReconnectNonce] = useState(reconnectNonce);
  if (prevReconnectNonce !== reconnectNonce) {
    setPrevReconnectNonce(reconnectNonce);
    setConnectionState("connecting");
    setConnected(false);
  }

  useEffect(() => {
    const socket = io("/?XTransformPort=3003", {
      path: "/",
      transports: ["polling", "websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    socketRef.current = socket;

    // 5s safety net: if the handshake hasn't completed, surface an error
    // state to the UI instead of spinning forever. socket.io's own
    // reconnection logic may still be running in the background, but we
    // disconnect here so we don't surprise the user with a late connection
    // while they're reading the demo data.
    const timeoutId = window.setTimeout(() => {
      if (!socket.connected) {
        setConnectionState("error");
        setConnected(false);
        socket.disconnect();
      }
    }, CONNECT_TIMEOUT_MS);

    socket.on("connect", () => {
      window.clearTimeout(timeoutId);
      setConnected(true);
      setConnectionState("connected");
    });

    socket.on("connect_error", () => {
      // Transient — socket.io will retry. Don't flip to "error" yet; the
      // 5s timeout is the authority on when to give up.
      setConnected(false);
    });

    socket.on("reconnect_failed", () => {
      window.clearTimeout(timeoutId);
      setConnected(false);
      setConnectionState("error");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      // If we were previously connected, go back to "connecting" while
      // socket.io auto-reconnects. Don't escalate to "error" for a dropped
      // connection — that's reserved for the initial-handshake failure.
      setConnectionState((prev) => (prev === "connected" ? "connecting" : prev));
    });

    socket.on("leaderboard", (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    socket.on("activity", (event: ActivityEvent) => {
      setActivities((prev) => {
        // dedupe by id
        if (prev.some((a) => a.id === event.id)) return prev;
        return [event, ...prev].slice(0, 30);
      });
    });

    socket.on("presence", (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    return () => {
      window.clearTimeout(timeoutId);
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [reconnectNonce]);

  // join once we have user info + a connection
  useEffect(() => {
    if (connectionState !== "connected" || !socketRef.current || joinedRef.current)
      return;
    if (!opts?.name) return;
    joinedRef.current = true;
    socketRef.current.emit("join", {
      name: opts.name,
      xp: opts.xp ?? 0,
      level: opts.level ?? 1,
      bestStreak: opts.bestStreak ?? 0,
    });
  }, [
    connectionState,
    opts?.name,
    opts?.xp,
    opts?.level,
    opts?.bestStreak,
  ]);

  // keep server XP in sync when our XP changes
  useEffect(() => {
    if (connectionState !== "connected" || !socketRef.current || !joinedRef.current)
      return;
    socketRef.current.emit("update-xp", {
      xp: opts?.xp ?? 0,
      level: opts?.level ?? 1,
    });
  }, [opts?.xp, opts?.level, connectionState]);

  const broadcastActivity = useCallback(
    (event: {
      type: ActivityEvent["type"];
      habitName?: string;
      streak?: number;
      level?: number;
    }) => {
      socketRef.current?.emit("activity", event);
    },
    []
  );

  // listen for local activity events (from habit toggles) and broadcast them
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        type: ActivityEvent["type"];
        habitName?: string;
        streak?: number;
      };
      broadcastActivity(detail);
    };
    window.addEventListener("abhyas-activity", handler);
    return () => window.removeEventListener("abhyas-activity", handler);
  }, [broadcastActivity]);

  /**
   * Manual retry — tears down the current socket (if any) and starts a fresh
   * connection attempt. Used by the "আবার চেষ্টা করুন" button in the error state.
   */
  const reconnect = useCallback(() => {
    setLeaderboard([]);
    setActivities([]);
    setOnlineCount(0);
    setReconnectNonce((n) => n + 1);
  }, []);

  return {
    connectionState,
    connected,
    leaderboard,
    activities,
    onlineCount,
    broadcastActivity,
    reconnect,
  };
}
