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
 * useSocial — connects to the social WebSocket mini-service (port 3003).
 * Returns live leaderboard + activity feed + a function to broadcast the
 * current user's activity.
 */
export function useSocial(opts?: {
  name?: string;
  xp?: number;
  level?: number;
  bestStreak?: number;
}) {
  const [connected, setConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const qc = useQueryClient();

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

    socket.on("connect", () => {
      setConnected(true);
    });
    socket.on("connect_error", () => {
      setConnected(false);
    });
    socket.on("disconnect", () => {
      setConnected(false);
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
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, []);

  // join once we have user info + a connection
  useEffect(() => {
    if (!connected || !socketRef.current || joinedRef.current) return;
    if (!opts?.name) return;
    joinedRef.current = true;
    socketRef.current.emit("join", {
      name: opts.name,
      xp: opts.xp ?? 0,
      level: opts.level ?? 1,
      bestStreak: opts.bestStreak ?? 0,
    });
  }, [connected, opts?.name, opts?.xp, opts?.level, opts?.bestStreak]);

  // keep server XP in sync when our XP changes
  useEffect(() => {
    if (!connected || !socketRef.current || !joinedRef.current) return;
    socketRef.current.emit("update-xp", {
      xp: opts?.xp ?? 0,
      level: opts?.level ?? 1,
    });
  }, [opts?.xp, opts?.level, connected]);

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

  return {
    connected,
    leaderboard,
    activities,
    onlineCount,
    broadcastActivity,
  };
}
