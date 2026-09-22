import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

/**
 * অভ্যাস (Abhyas) — Social WebSocket Mini-Service
 * Port 3003 (hardcoded — DO NOT read from env) — Socket.io server powering the
 * global leaderboard + live activity feed.
 *
 * Standalone Bun project: `bun run dev` (or `bun --hot index.ts`) starts this
 * file. Hot-reload is supported by Bun's `--hot` flag.
 *
 * ----------------------------------------------------------------------------
 * Architecture — room-based grouping
 * ----------------------------------------------------------------------------
 * Every connected socket is auto-joined to the `"global"` room on connect.
 * All leaderboard/activity/presence broadcasts are scoped to that room via
 * `io.to("global").emit(...)`. Clients can additionally join other rooms with
 * the `join-room` event (reserved for future friend-group / challenge rooms);
 * the global room remains the default for the public leaderboard.
 *
 * ----------------------------------------------------------------------------
 * Event protocol
 * ----------------------------------------------------------------------------
 * Client → server:
 *   - "join"           { name, xp, level, bestStreak }   register presence + identity
 *   - "join-room"      { room }                           opt into an additional room
 *   - "leave-room"     { room }                           leave an additional room
 *   - "activity"       { type, habitName?, streak?, level? }  broadcast a habit event
 *   - "update-xp"      { xp, level }                      keep server XP in sync (re-ranks)
 *   - "get-leaderboard"  (no payload)                     request a fresh leaderboard snapshot
 *
 * Server → client:
 *   - "leaderboard"    LeaderboardEntry[]   top 20 by XP (current user injected)
 *   - "activity"       ActivityEvent        a single live activity event
 *   - "presence"       { count }            number of online users in the global room
 *   - "rooms"          { rooms: string[] }  list of available rooms (informational)
 *   - "connected"      { id }               ack on connect with the assigned socket id
 */

// ---- Types (mirrored on the client in src/hooks/use-social.ts) ----
interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  level: number;
  bestStreak: number;
  isYou?: boolean;
}

type ActivityType = "completion" | "streak" | "levelup" | "join";

interface ActivityEvent {
  id: string;
  userName: string;
  type: ActivityType;
  habitName?: string;
  streak?: number;
  level?: number;
  timestamp: number;
}

// ---- Constants ----
const PORT = 3003;
const GLOBAL_ROOM = "global";
const MAX_FEED = 30;
const LEADERBOARD_SIZE = 20;

// NO demo/seed users — this is a production social service. The leaderboard
// only contains REAL connected users; when nobody else is online the client
// renders a proper empty state ("আপনি প্রথম ব্যবহারকারী") instead of fake
// competitors. Real friends/leaderboard growth comes from real connections.

// ---- In-memory state ----
/** socket.id → live user entry. Demo users are NOT here (they're static seeds). */
const liveUsers = new Map<string, LeaderboardEntry>();
/** Recent activity feed (newest first, capped at MAX_FEED). */
const activityFeed: ActivityEvent[] = [];

// ---- HTTP + Socket.io server ----
const httpServer = createServer();
const io = new Server(httpServer, {
  // Path MUST stay "/" — the sandbox Caddy gateway forwards
  // `/?XTransformPort=3003` requests by path+query, and production clients
  // connect with `path: "/"` too. (Default "/socket.io/" breaks both.)
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

// Health check endpoint — registered AFTER Socket.io so we use prependListener
// to ensure it fires BEFORE Socket.io's request handler.
// Returns 200 OK for Coolify/load balancer healthchecks.
httpServer.prependListener("request", (req, res) => {
  if (req.url === "/healthz" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), ts: Date.now() }));
  }
});

// ---------------------------------------------------------------------------
// Redis adapter for horizontal scaling
// ---------------------------------------------------------------------------
// When REDIS_URL is set, the Socket.io server uses a Redis pub/sub adapter
// to share events (emits, joins, disconnects) across multiple instances.
// This enables horizontal scaling — deploy N social-service containers behind
// a load balancer and all connected clients receive consistent broadcasts.
//
// If REDIS_URL is not set, the server runs in single-instance mode (default
// for development and small deployments). No functionality is lost.
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`[social] Redis adapter connected — horizontal scaling enabled.`);
    })
    .catch((err) => {
      console.error(`[social] Redis adapter failed to connect:`, err);
      console.error(`[social] Continuing in single-instance mode.`);
    });
}

/** Broadcast presence count to the global room. */
function broadcastPresence(): void {
  io.to(GLOBAL_ROOM).emit("presence", {
    count: liveUsers.size,
  });
}

/** Build the sorted leaderboard (no isYou markers — pure ranking). */
function buildLeaderboard(): LeaderboardEntry[] {
  const live = Array.from(liveUsers.values());

  // Sort by XP desc, then streak desc, then name asc for stable ordering.
  live.sort((a, b) => b.xp - a.xp || b.bestStreak - a.bestStreak || a.name.localeCompare(b.name));

  return live.slice(0, LEADERBOARD_SIZE);
}

/** Build a leaderboard tagged for a specific viewer (their row marked isYou). */
function buildLeaderboardForYou(youId?: string): LeaderboardEntry[] {
  const top = buildLeaderboard().map((u) => ({
    ...u,
    isYou: youId !== undefined && u.id === youId,
  }));
  // Ensure the viewer is always visible — append them if they're outside top 20.
  if (youId && !top.some((u) => u.id === youId)) {
    const you = liveUsers.get(youId);
    if (you) top.push({ ...you, isYou: true });
  }
  return top;
}

/**
 * Broadcast a leaderboard snapshot to the global room.
 *
 * CRITICAL: each connected socket receives a PERSONALIZED snapshot — its own
 * entry is marked `isYou: true`. A single `io.to(room).emit(...)` would send
 * the same payload to everyone and break the client's `findIndex((e) => e.isYou)`
 * rank calculation. We iterate over joined sockets (liveUsers) and emit one
 * snapshot per socket.
 */
function broadcastLeaderboard(): void {
  // Personalized snapshots for every joined user.
  const joinedIds = Array.from(liveUsers.keys());
  for (const socketId of joinedIds) {
    io.to(socketId).emit("leaderboard", buildLeaderboardForYou(socketId));
  }
  // Non-joined sockets (just connected, browsing) get a generic snapshot too
  // so their UI updates in real time. They have no isYou entry yet.
  // `except()` takes a room name or array of names — we exclude the joined
  // sockets (who already got a personalized snapshot above).
  if (joinedIds.length > 0) {
    io.to(GLOBAL_ROOM).except(joinedIds).emit(
      "leaderboard",
      buildLeaderboardForYou()
    );
  } else {
    io.to(GLOBAL_ROOM).emit("leaderboard", buildLeaderboardForYou());
  }
}

/** Push an activity event into the feed + broadcast to the global room. */
function pushActivity(event: Omit<ActivityEvent, "id" | "timestamp">): void {
  const full: ActivityEvent = {
    ...event,
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
  activityFeed.unshift(full);
  if (activityFeed.length > MAX_FEED) activityFeed.pop();
  io.to(GLOBAL_ROOM).emit("activity", full);
}

// ---- Connection lifecycle ----
io.on("connection", (socket) => {
  console.log(`[social] connected: ${socket.id}`);

  // Auto-join the global room so this socket receives leaderboard/activity/presence.
  void socket.join(GLOBAL_ROOM);

  // Send initial state immediately so the UI can render before the user "joins".
  socket.emit("connected", { id: socket.id });
  socket.emit("rooms", { rooms: [GLOBAL_ROOM] });
  socket.emit("leaderboard", buildLeaderboardForYou(socket.id));
  socket.emit("presence", { count: liveUsers.size });
  // Replay the last 10 activities as the initial feed (newest first).
  for (const a of activityFeed.slice(0, 10)) {
    socket.emit("activity", a);
  }

  // Register the user's identity + presence.
  socket.on(
    "join",
    (data: { name?: string; xp?: number; level?: number; bestStreak?: number }) => {
      const entry: LeaderboardEntry = {
        id: socket.id,
        name: data.name?.trim() || "অতিথি",
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        bestStreak: data.bestStreak ?? 0,
        isYou: true,
      };
      liveUsers.set(socket.id, entry);
      console.log(`[social] ${entry.name} joined (xp=${entry.xp}, level=${entry.level})`);
      pushActivity({ userName: entry.name, type: "join" });
      broadcastLeaderboard();
      broadcastPresence();
    }
  );

  // Optional: join an additional room (future friend-group / challenge rooms).
  socket.on("join-room", (data: { room?: string }) => {
    const room = data.room?.trim();
    if (!room || room === GLOBAL_ROOM) return;
    void socket.join(room);
    socket.emit("rooms", { rooms: [GLOBAL_ROOM, room] });
    console.log(`[social] ${socket.id} joined room: ${room}`);
  });

  // Leave an additional room (cannot leave the global room).
  socket.on("leave-room", (data: { room?: string }) => {
    const room = data.room?.trim();
    if (!room || room === GLOBAL_ROOM) return;
    void socket.leave(room);
    socket.emit("rooms", { rooms: [GLOBAL_ROOM] });
    console.log(`[social] ${socket.id} left room: ${room}`);
  });

  // Broadcast a habit completion / streak / level-up event.
  socket.on(
    "activity",
    (data: {
      type: ActivityType;
      habitName?: string;
      streak?: number;
      level?: number;
    }) => {
      const user = liveUsers.get(socket.id);
      if (!user) return;
      pushActivity({
        userName: user.name,
        type: data.type,
        habitName: data.habitName,
        streak: data.streak,
        level: data.level,
      });
    }
  );

  // Keep the server's view of XP in sync (e.g. when a habit is toggled).
  // Re-ranks the leaderboard + fires a level-up activity if level increased.
  socket.on("update-xp", (data: { xp?: number; level?: number }) => {
    const user = liveUsers.get(socket.id);
    if (!user) return;
    const oldLevel = user.level;
    user.xp = data.xp ?? user.xp;
    user.level = data.level ?? user.level;
    if (user.level > oldLevel) {
      pushActivity({ userName: user.name, type: "levelup", level: user.level });
    }
    broadcastLeaderboard();
  });

  // On-demand leaderboard refresh (e.g. after reconnect).
  socket.on("get-leaderboard", () => {
    socket.emit("leaderboard", buildLeaderboardForYou(socket.id));
  });

  socket.on("disconnect", () => {
    const user = liveUsers.get(socket.id);
    if (user) {
      liveUsers.delete(socket.id);
      console.log(`[social] ${user.name} left`);
      broadcastLeaderboard();
      broadcastPresence();
    } else {
      console.log(`[social] anonymous disconnected: ${socket.id}`);
    }
  });
});

// ---- Boot ----
httpServer.listen(PORT, () => {
  console.log(`[social] WebSocket server running on port ${PORT}`);
  console.log(`[social] global room ready — real users only (no demo seeds)`);
});

// ---- Graceful shutdown ----
process.on("SIGTERM", () => {
  console.log("[social] SIGTERM received, shutting down...");
  io.to(GLOBAL_ROOM).emit("presence", { count: 0 });
  io.close(() => httpServer.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  console.log("[social] SIGINT received, shutting down...");
  io.close(() => httpServer.close(() => process.exit(0)));
});
