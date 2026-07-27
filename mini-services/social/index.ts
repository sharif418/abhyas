import { createServer } from "http";
import { Server } from "socket.io";

/**
 * অভ্যাস Social Mini-Service
 * Port 3003 — socket.io server powering the global leaderboard + live activity feed.
 *
 * Events (client → server):
 *   - 'join'        { name }              → register presence
 *   - 'activity'    { type, habitName }   → broadcast a habit completion/streak event
 *
 * Events (server → client):
 *   - 'leaderboard'  LeaderboardEntry[]   → top 20 users by XP (current user injected)
 *   - 'activity'     ActivityEvent        → a single live activity event
 *   - 'presence'     { count }            → number of online users
 */

interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  level: number;
  bestStreak: number;
  isYou?: boolean;
}

interface ActivityEvent {
  id: string;
  userName: string;
  type: "completion" | "streak" | "levelup" | "join";
  habitName?: string;
  streak?: number;
  level?: number;
  timestamp: number;
}

// ---- Seed demo users for a lively leaderboard ----
const DEMO_USERS: LeaderboardEntry[] = [
  { id: "demo-1", name: "আরিফ", xp: 2840, level: 8, bestStreak: 47 },
  { id: "demo-2", name: "সাবরিনা", xp: 2450, level: 7, bestStreak: 62 },
  { id: "demo-3", name: "তানভীর", xp: 2100, level: 7, bestStreak: 33 },
  { id: "demo-4", name: "নুসরাত", xp: 1850, level: 6, bestStreak: 28 },
  { id: "demo-5", name: "ইমরান", xp: 1620, level: 6, bestStreak: 51 },
  { id: "demo-6", name: "ফারিয়া", xp: 1340, level: 5, bestStreak: 19 },
  { id: "demo-7", name: "রাকিব", xp: 1180, level: 5, bestStreak: 24 },
  { id: "demo-8", name: "মেহজাবিন", xp: 920, level: 4, bestStreak: 17 },
  { id: "demo-9", name: "শাকিল", xp: 760, level: 4, bestStreak: 12 },
  { id: "demo-10", name: "জারিন", xp: 540, level: 3, bestStreak: 8 },
];

// live store: socket.id → user entry (the real connected user)
const liveUsers = new Map<string, LeaderboardEntry>();
const activityFeed: ActivityEvent[] = [];
const MAX_FEED = 30;

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

function buildLeaderboard(youId?: string): LeaderboardEntry[] {
  // merge demo users + live users, sort by XP desc, top 20
  const live = Array.from(liveUsers.values()).map((u) => ({
    ...u,
    isYou: u.id === youId,
  }));
  const merged = [...DEMO_USERS, ...live];
  // dedupe by id (live users override demo if same id — won't happen here)
  const seen = new Set<string>();
  const unique = merged.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
  unique.sort((a, b) => b.xp - a.xp);
  const top = unique.slice(0, 20);
  // ensure "you" is always visible
  if (youId) {
    const youIdx = top.findIndex((u) => u.id === youId);
    if (youIdx === -1) {
      const you = live.find((u) => u.id === youId);
      if (you) {
        const youRank = unique.findIndex((u) => u.id === youId);
        top.push({ ...you, isYou: true });
        void youRank;
      }
    }
  }
  return top;
}

function pushActivity(event: Omit<ActivityEvent, "id" | "timestamp">) {
  const full: ActivityEvent = {
    ...event,
    id: Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
  activityFeed.unshift(full);
  if (activityFeed.length > MAX_FEED) activityFeed.pop();
  io.emit("activity", full);
}

io.on("connection", (socket) => {
  console.log(`[social] connected: ${socket.id}`);

  // send current state on connect
  socket.emit("leaderboard", buildLeaderboard());
  socket.emit("presence", { count: liveUsers.size + DEMO_USERS.length });
  // send last 10 activities as initial feed
  for (const a of activityFeed.slice(0, 10)) {
    socket.emit("activity", a);
  }

  socket.on(
    "join",
    (data: { name: string; xp: number; level: number; bestStreak: number }) => {
      const entry: LeaderboardEntry = {
        id: socket.id,
        name: data.name || "অতিথি",
        xp: data.xp || 0,
        level: data.level || 1,
        bestStreak: data.bestStreak || 0,
        isYou: true,
      };
      liveUsers.set(socket.id, entry);
      console.log(`[social] ${entry.name} joined (xp=${entry.xp})`);
      pushActivity({ userName: entry.name, type: "join" });
      io.emit("leaderboard", buildLeaderboard());
      io.emit("presence", { count: liveUsers.size + DEMO_USERS.length });
    }
  );

  socket.on(
    "activity",
    (data: { type: ActivityEvent["type"]; habitName?: string; streak?: number; level?: number }) => {
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

  socket.on("update-xp", (data: { xp: number; level: number }) => {
    const user = liveUsers.get(socket.id);
    if (!user) return;
    const oldLevel = user.level;
    user.xp = data.xp;
    user.level = data.level;
    if (data.level > oldLevel) {
      pushActivity({
        userName: user.name,
        type: "levelup",
        level: data.level,
      });
    }
    io.emit("leaderboard", buildLeaderboard());
  });

  socket.on("disconnect", () => {
    const user = liveUsers.get(socket.id);
    if (user) {
      liveUsers.delete(socket.id);
      console.log(`[social] ${user.name} left`);
      io.emit("leaderboard", buildLeaderboard());
      io.emit("presence", { count: liveUsers.size + DEMO_USERS.length });
    }
  });
});

// Periodically emit demo activity to make the feed feel alive
const DEMO_ACTIVITIES = [
  { userName: "আরিফ", type: "completion" as const, habitName: "ফজরের নামাজ", streak: 47 },
  { userName: "সাবরিনা", type: "streak" as const, habitName: "কুরআন তিলাওয়াত", streak: 62 },
  { userName: "তানভীর", type: "completion" as const, habitName: "সকালের ব্যায়াম", streak: 12 },
  { userName: "নুসরাত", type: "completion" as const, habitName: "পানি পান", streak: 28 },
  { userName: "ইমরান", type: "streak" as const, habitName: "পড়াশোনা", streak: 51 },
  { userName: "ফারিয়া", type: "completion" as const, habitName: "ডায়েরি লেখা", streak: 19 },
];
let demoIdx = 0;
setInterval(() => {
  const a = DEMO_ACTIVITIES[demoIdx % DEMO_ACTIVITIES.length];
  demoIdx++;
  pushActivity(a);
}, 18000); // every 18s

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[social] WebSocket server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
