import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import postgres from "postgres";

/**
 * অভ্যাস (Abhyas) — Social WebSocket Mini-Service (REAL-data edition)
 * Port 3003 (hardcoded — DO NOT read from env).
 *
 * ----------------------------------------------------------------------------
 * What is REAL here
 * ----------------------------------------------------------------------------
 * - The leaderboard is backed by the production PostgreSQL database (the same
 *   `User` / `Habit` tables the main app writes to). Every entry is a real
 *   registered app user with their real persisted XP / level / best streak.
 * - The shared guest row (`local-default-user`) is EXCLUDED from the board —
 *   a leaderboard is a competition between real, distinct identities. Guests
 *   get an honest "create an account to compete" state on the client.
 * - Presence ("online now") and the activity feed are live WebSocket state —
 *   real people, currently connected, doing real things. No fabricated feed.
 * - If DATABASE_URL is unset/unreachable (local dev), the service degrades to
 *   live-connections-only mode: the board shows just the people currently
 *   connected. Still 100% real — never demo.
 *
 * ----------------------------------------------------------------------------
 * Event protocol (client → server)
 * ----------------------------------------------------------------------------
 *   - "join"          { userId?, name, xp, level, bestStreak }  register identity
 *   - "join-room"     { room }                                  opt into extra room
 *   - "leave-room"    { room }                                  leave extra room
 *   - "activity"      { type, habitName?, streak?, level? }     broadcast real event
 *   - "update-xp"     { xp, level }                             live XP sync (re-ranks)
 *   - "get-leaderboard"                                        request fresh snapshot
 *
 * Server → client:
 *   - "leaderboard"   LeaderboardEntry[]  top 20 real users (+ you, ranked)
 *   - "activity"      ActivityEvent       a real live event
 *   - "presence"      { count }           sockets online right now
 *   - "rooms"         { rooms: string[] } joined rooms (informational)
 *   - "connected"     { id }              ack with assigned socket id
 */

// ---- Types (mirrored on the client in src/hooks/use-social.ts) ----
interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  level: number;
  bestStreak: number;
  rank?: number;
  online?: boolean;
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

/** A live connected socket's identity. */
interface LiveUser {
  socketId: string;
  userId?: string; // undefined → legacy/guest client without an account id
  name: string;
  xp: number;
  level: number;
}

// ---- Constants ----
const PORT = 3003;
const GLOBAL_ROOM = "global";
const MAX_FEED = 30;
const LEADERBOARD_SIZE = 20;
/** The shared guest row — excluded from the leaderboard (not a real identity). */
const GUEST_USER_ID = "local-default-user";
/** Periodic DB refresh cadence while anyone is online. */
const REFRESH_INTERVAL_MS = 60_000;
/** Debounce for DB reconciliation after an update-xp event. */
const REFRESH_DEBOUNCE_MS = 2_500;
/** Rank cache TTL per user. */
const RANK_TTL_MS = 30_000;

// ---- In-memory state ----
/** socket.id → live user entry (real connected people only). */
const liveSockets = new Map<string, LiveUser>();
/** Top-N real users from the database (the persistent leaderboard). */
let dbLeaderboard: LeaderboardEntry[] = [];
/** userId → computed rank (for users outside the top list). */
const rankCache = new Map<string, { rank: number; expires: number }>();
/** Recent real activity feed (newest first, capped). */
const activityFeed: ActivityEvent[] = [];

// ---------------------------------------------------------------------------
// Database layer — the source of truth for the leaderboard
// ---------------------------------------------------------------------------
// The main app (Next.js + Prisma) persists every habit toggle as XP on the
// User row. This service READS that truth and mirrors it into the live board.
// Writes stay exclusively with the main app — single-writer principle.

/** Strip Prisma-style query params (?schema=public) that postgres.js rejects. */
function sanitizeDbUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.search = "";
    return url.toString();
  } catch {
    return raw;
  }
}

/** Only real PostgreSQL URLs activate DB mode (local dev uses SQLite). */
function isPostgresUrl(raw: string): boolean {
  return /^postgres(ql)?:\/\//.test(raw.trim());
}

const DATABASE_URL =
  process.env.DATABASE_URL && isPostgresUrl(process.env.DATABASE_URL)
    ? sanitizeDbUrl(process.env.DATABASE_URL)
    : undefined;

/** Undefined in local/dev mode (no DB) → live-connections-only leaderboard. */
const sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
      // Never let a slow DB block the event loop's socket traffic.
      fetch_types: false,
    })
  : undefined;

let dbHealthy = false;
let lastDbErrorLog = 0;

function logDbError(scope: string, err: unknown): void {
  const now = Date.now();
  if (now - lastDbErrorLog > 60_000) {
    lastDbErrorLog = now;
    console.error(`[social] DB error (${scope}):`, (err as Error)?.message ?? err);
  }
}

/** Fetch the top real users (XP desc → bestStreak desc → name asc). */
async function refreshLeaderboard(): Promise<void> {
  if (!sql) return;
  try {
    const rows = await sql<LeaderboardEntry[]>`
      SELECT u.id, u.name, u.xp, u.level,
             COALESCE((SELECT MAX(h."bestStreak") FROM "Habit" h
                       WHERE h."userId" = u.id), 0) AS "bestStreak"
      FROM "User" u
      WHERE u.id <> ${GUEST_USER_ID}
      ORDER BY u.xp DESC, "bestStreak" DESC, u.name ASC
      LIMIT ${LEADERBOARD_SIZE}
    `;
    dbLeaderboard = rows.map((r) => ({ ...r, bestStreak: Number(r.bestStreak ?? 0) }));
    dbHealthy = true;

    // Refresh ranks for online registered users that sit outside the top list.
    const onlineIds = new Set(
      Array.from(liveSockets.values())
        .map((u) => u.userId)
        .filter((id): id is string => !!id && id !== GUEST_USER_ID)
    );
    for (const userId of onlineIds) {
      if (!dbLeaderboard.some((u) => u.id === userId)) await computeRankFor(userId);
    }
  } catch (err) {
    dbHealthy = false;
    logDbError("refreshLeaderboard", err);
  }
}

/** Compute + cache the precise rank of one user (COUNT of users ranked above). */
async function computeRankFor(userId: string): Promise<void> {
  if (!sql) return;
  try {
    const rows = await sql`
      WITH ranked AS (
        SELECT u.id, u.xp, u.name,
               COALESCE((SELECT MAX(h."bestStreak") FROM "Habit" h
                         WHERE h."userId" = u.id), 0) AS bs
        FROM "User" u WHERE u.id <> ${GUEST_USER_ID}
      )
      SELECT COUNT(*)::int + 1 AS rank
      FROM ranked r,
           (SELECT xp, name,
                   COALESCE((SELECT MAX(h."bestStreak") FROM "Habit" h
                             WHERE h."userId" = ${userId}), 0) AS bs
            FROM "User" WHERE id = ${userId}) me
      WHERE r.xp > me.xp
         OR (r.xp = me.xp AND r.bs > me.bs)
         OR (r.xp = me.xp AND r.bs = me.bs AND r.name < me.name)
    `;
    const rank = Number(rows[0]?.rank ?? 0);
    if (rank > 0) {
      rankCache.set(userId, { rank, expires: Date.now() + RANK_TTL_MS });
    }
  } catch (err) {
    logDbError("computeRankFor", err);
  }
}

// ---------------------------------------------------------------------------
// Leaderboard assembly — DB truth + live overlay
// ---------------------------------------------------------------------------

/** UserIds with at least one live socket right now. */
function onlineUserIds(): Set<string> {
  const ids = new Set<string>();
  for (const u of liveSockets.values()) {
    if (u.userId && u.userId !== GUEST_USER_ID) ids.add(u.userId);
  }
  return ids;
}

/**
 * Build a leaderboard snapshot, personalized for one viewer socket.
 *
 * DB mode: top real users from the database, `online` overlaid from live
 * sockets, `isYou` on the viewer's own userId (appended with their precise
 * cached rank if outside the top list).
 *
 * Fallback mode (no DB): the board is the live connected users only.
 */
function buildLeaderboardForYou(viewerSocketId?: string): LeaderboardEntry[] {
  const online = onlineUserIds();

  // DB mode is active once the database has answered at least once. Before
  // that (boot race / unreachable DB), fall back to live-connections-only so
  // the board is never blank-or-fake — always real.
  const useDb = sql !== undefined && (dbHealthy || dbLeaderboard.length > 0);
  if (!useDb) {
    // Fallback (local dev): live connections only, isYou by socket id.
    const live = Array.from(liveSockets.values()).map((u) => ({
      id: u.socketId,
      name: u.name,
      xp: u.xp,
      level: u.level,
      bestStreak: 0,
      isYou: viewerSocketId !== undefined && u.socketId === viewerSocketId,
    }));
    live.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    return live.slice(0, LEADERBOARD_SIZE);
  }

  const board: LeaderboardEntry[] = dbLeaderboard.map((u, i) => ({
    ...u,
    rank: i + 1,
    online: online.has(u.id),
    isYou: false,
  }));

  const viewer = viewerSocketId ? liveSockets.get(viewerSocketId) : undefined;
  const viewerId = viewer?.userId;

  if (viewer && viewerId && viewerId !== GUEST_USER_ID) {
    const idx = board.findIndex((u) => u.id === viewerId);
    if (idx >= 0) {
      // Overlay the viewer's freshest live values (instant feedback), then mark.
      board[idx] = {
        ...board[idx],
        xp: viewer.xp,
        level: viewer.level,
        isYou: true,
      };
      // Keep XP-desc ordering after the live patch.
      board.sort((a, b) => b.xp - a.xp);
      board.forEach((u, i) => (u.rank = i + 1));
    } else {
      // Outside the top list → append with the precise cached rank.
      const cached = rankCache.get(viewerId);
      board.push({
        id: viewerId,
        name: viewer.name,
        xp: viewer.xp,
        level: viewer.level,
        bestStreak: 0,
        rank: cached && cached.expires > Date.now() ? cached.rank : board.length + 1,
        online: true,
        isYou: true,
      });
    }
  }
  return board;
}

/**
 * Personalized snapshot per joined socket; anonymous sockets get the generic
 * board. A single room-wide emit would break per-viewer `isYou` markers.
 */
function broadcastLeaderboard(): void {
  const joinedIds = Array.from(liveSockets.keys());
  for (const socketId of joinedIds) {
    io.to(socketId).emit("leaderboard", buildLeaderboardForYou(socketId));
  }
  if (joinedIds.length > 0) {
    io.to(GLOBAL_ROOM).except(joinedIds).emit(
      "leaderboard",
      buildLeaderboardForYou()
    );
  } else {
    io.to(GLOBAL_ROOM).emit("leaderboard", buildLeaderboardForYou());
  }
}

// ---------------------------------------------------------------------------
// Refresh scheduling
// ---------------------------------------------------------------------------
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced DB reconciliation (the main app has already persisted the XP). */
function scheduleRefresh(): void {
  if (!sql) return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshLeaderboard()
      .then(() => broadcastLeaderboard())
      .catch(() => undefined);
  }, REFRESH_DEBOUNCE_MS);
}

// Only poll the DB while real people are connected.
setInterval(() => {
  if (liveSockets.size > 0) {
    refreshLeaderboard()
      .then(() => broadcastLeaderboard())
      .catch(() => undefined);
  }
}, REFRESH_INTERVAL_MS);
refreshTimer = null;

/** Push a real activity event into the feed + broadcast it. */
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

/** Broadcast how many people are online right now. */
function broadcastPresence(): void {
  io.to(GLOBAL_ROOM).emit("presence", { count: liveSockets.size });
}

// ---------------------------------------------------------------------------
// HTTP + Socket.io server
// ---------------------------------------------------------------------------
const httpServer = createServer();
const io = new Server(httpServer, {
  // Path MUST stay "/" — the sandbox Caddy gateway forwards `/?XTransformPort=3003`
  // by path+query, and production clients connect with `path: "/"` too.
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

// Health check — own the request routing so /healthz is answered exactly once
// (Socket.io + a second listener would both try to respond → header crashes).
const engineListeners = httpServer.listeners("request");
httpServer.removeAllListeners("request");
httpServer.on("request", (req, res) => {
  if (req.url === "/healthz" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        db: sql ? (dbHealthy ? "ok" : "degraded") : "not-configured",
        liveSockets: liveSockets.size,
        uptime: process.uptime(),
        ts: Date.now(),
      })
    );
    return;
  }
  // Everything else → Socket.io / engine.io.
  for (const listener of engineListeners) {
    (listener as (req: unknown, res: unknown) => void)(req, res);
  }
});

// ---------------------------------------------------------------------------
// Redis adapter (optional) — horizontal scaling across N instances
// ---------------------------------------------------------------------------
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
      console.error(`[social] Redis adapter failed:`, err?.message ?? err);
      console.error(`[social] Continuing in single-instance mode.`);
    });
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  // Auto-join the global room so every socket receives broadcasts.
  void socket.join(GLOBAL_ROOM);

  // Initial state — the DB snapshot may still be loading at boot; the periodic
  // refresh + join-triggered broadcast reconcile it within moments.
  socket.emit("connected", { id: socket.id });
  socket.emit("rooms", { rooms: [GLOBAL_ROOM] });
  socket.emit("leaderboard", buildLeaderboardForYou(socket.id));
  socket.emit("presence", { count: liveSockets.size });
  for (const a of activityFeed.slice(0, 10)) {
    socket.emit("activity", a);
  }

  // Register identity + presence. `userId` comes from the client's /api/me —
  // the real account id (registered users only appear on the board).
  socket.on(
    "join",
    (data: {
      userId?: string;
      name?: string;
      xp?: number;
      level?: number;
      bestStreak?: number;
    }) => {
      const userId =
        data.userId && data.userId !== GUEST_USER_ID ? data.userId : undefined;
      const live: LiveUser = {
        socketId: socket.id,
        userId,
        name: data.name?.trim() || "অতিথি",
        xp: data.xp ?? 0,
        level: data.level ?? 1,
      };
      liveSockets.set(socket.id, live);

      // Only real registered accounts announce joins — guest traffic would
      // flood the feed with indistinguishable "অতিথি" entries.
      if (userId) {
        pushActivity({ userName: live.name, type: "join" });
        computeRankFor(userId).finally(() => broadcastLeaderboard());
      } else {
        broadcastLeaderboard();
      }
      broadcastPresence();
    }
  );

  // Optional extra rooms (future friend-group / challenge rooms).
  socket.on("join-room", (data: { room?: string }) => {
    const room = data.room?.trim();
    if (!room || room === GLOBAL_ROOM) return;
    void socket.join(room);
    socket.emit("rooms", { rooms: [GLOBAL_ROOM, room] });
  });
  socket.on("leave-room", (data: { room?: string }) => {
    const room = data.room?.trim();
    if (!room || room === GLOBAL_ROOM) return;
    void socket.leave(room);
    socket.emit("rooms", { rooms: [GLOBAL_ROOM] });
  });

  // Broadcast a real habit completion / streak / level-up event.
  socket.on(
    "activity",
    (data: {
      type: ActivityType;
      habitName?: string;
      streak?: number;
      level?: number;
    }) => {
      const user = liveSockets.get(socket.id);
      if (!user) return; // must join first — real identity, real events
      pushActivity({
        userName: user.name,
        type: data.type,
        habitName: data.habitName,
        streak: data.streak,
        level: data.level,
      });
    }
  );

  // Live XP sync — the main app has ALREADY persisted this value; patch the
  // in-memory board for instant feedback, then reconcile from the DB shortly.
  socket.on("update-xp", (data: { xp?: number; level?: number }) => {
    const user = liveSockets.get(socket.id);
    if (!user) return;
    const oldLevel = user.level;
    if (data.xp !== undefined) user.xp = data.xp;
    if (data.level !== undefined) user.level = data.level;
    if (user.level > oldLevel) {
      pushActivity({ userName: user.name, type: "levelup", level: user.level });
    }
    // Patch the DB snapshot row so everyone sees the new XP immediately.
    if (user.userId) {
      const row = dbLeaderboard.find((u) => u.id === user.userId);
      if (row) {
        row.xp = user.xp;
        row.level = user.level;
        dbLeaderboard.sort((a, b) => b.xp - a.xp);
      }
    }
    broadcastLeaderboard();
    scheduleRefresh();
  });

  // On-demand snapshot (e.g. after a client-side reconnect).
  socket.on("get-leaderboard", () => {
    socket.emit("leaderboard", buildLeaderboardForYou(socket.id));
  });

  socket.on("disconnect", () => {
    if (liveSockets.delete(socket.id)) {
      broadcastLeaderboard();
      broadcastPresence();
    }
  });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[social] WebSocket server running on port ${PORT}`);
  if (sql) {
    console.log(`[social] DB mode: leaderboard backed by PostgreSQL (real users only)`);
    refreshLeaderboard()
      .then(() => {
        console.log(
          `[social] initial leaderboard loaded — ${dbLeaderboard.length} registered user(s)`
        );
        broadcastLeaderboard();
      })
      .catch(() => console.error(`[social] initial DB load failed — will retry`));
  } else {
    console.log(
      `[social] DB mode: no PostgreSQL DATABASE_URL — live-connections-only leaderboard`
    );
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
process.on("SIGTERM", () => {
  io.to(GLOBAL_ROOM).emit("presence", { count: 0 });
  io.close(() => httpServer.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  io.close(() => httpServer.close(() => process.exit(0)));
});
