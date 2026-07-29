// অভ্যাস Service Worker — offline-first caching for the PWA.
// Strategy:
//  - precache: app shell (/, manifest, icon)
//  - runtime cache (stale-while-revalidate): same-origin GET (Next.js assets, /api)
//  - network-first for /api/* with cache fallback (fresh data when online)
//  - opaque fallback for the Aladhan prayer-times API

// Bumped to v4: added `push` + `notificationclick` handlers for VAPID push.
const CACHE_VERSION = "abhyas-v4";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Next.js HMR + dev-only requests
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Handle POST/PUT/DELETE: queue for background sync when offline
  if (request.method !== "GET") {
    // Only queue API mutations (not auth or other endpoints)
    if (url.pathname.startsWith("/api/habits/") && url.pathname.includes("/toggle")) {
      event.respondWith(handleMutation(request));
    }
    return;
  }

  // Network-first for API routes (fresh data preferred, cache fallback offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate for same-origin navigation + assets
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Opaque cache for cross-origin (Aladhan API assets if any)
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    const copy = res.clone();
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, copy);
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // navigation fallback
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        cache.put(request, copy);
      }
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

// ---- Offline mutation queue (Background Sync) ----
const MUTATION_QUEUE = "abhyas-mutation-queue";
const MUTATION_STORE = "mutations";

function openMutationDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MUTATION_QUEUE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(request) {
  const body = await request.clone().text();
  const mutation = {
    url: request.url,
    method: request.method,
    body: body,
    headers: { "Content-Type": "application/json" },
    timestamp: Date.now(),
  };
  const db = await openMutationDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, "readwrite");
    tx.objectStore(MUTATION_STORE).add(mutation);
    tx.oncomplete = () => {
      // Register for background sync
      if ("sync" in self.registration) {
        self.registration.sync.register("abhyas-sync").catch(() => {});
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function handleMutation(request) {
  try {
    // Try network first
    const res = await fetch(request.clone());
    if (res.ok) return res;
    throw new Error("Network failed");
  } catch (e) {
    // Network failed — queue for later
    await queueMutation(request);
    // Return a synthetic success so the optimistic UI doesn't roll back
    return new Response(
      JSON.stringify({
        completed: true,
        streak: 0,
        bestStreak: 0,
        xpAwarded: 0,
        totalXp: 0,
        level: 1,
        leveledUp: false,
        newBadgeIds: [],
        offline: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Process queued mutations when connectivity is restored
self.addEventListener("sync", (event) => {
  if (event.tag === "abhyas-sync") {
    event.waitUntil(processQueue());
  }
});

// ---- Web Push (VAPID) event handlers ----
//
// `push`     — fired when the push service delivers a message. We parse
//              the JSON payload (sent by src/lib/push-server.ts) and
//              display a Bengali notification via the SW registration.
//
// `notificationclick` — focus an existing app tab (or open a new one)
//              and navigate to the payload's URL. This lets a tap on a
//              "আপনার অভ্যাস সম্পন্ন করার সময় হয়েছে" reminder jump
//              straight into the app.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Some push services deliver plain-text payloads — fall back gracefully.
    payload = event.data ? { body: event.data.text() } : {};
  }

  const title = payload.title || "🔔 অভ্যাস";
  const options = {
    body: payload.body || "আপনার অভ্যাস সম্পন্ন করার সময় হয়েছে",
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    tag: payload.tag || "abhyas-habit",
    data: payload.data || { url: "/" },
    vibrate: [80, 40, 80],
    requireInteraction: false,
    // Reuse tag for collapse: newer notif with same tag replaces older.
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Focus an existing tab on our origin (and navigate to target URL).
      for (const client of allClients) {
        if (client.url && client.url.includes(self.location.origin)) {
          if ("focus" in client) {
            try {
              await client.focus();
            } catch {
              /* ignore */
            }
          }
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }

      // No existing tab — open a fresh one.
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

// Close-all handler — useful for clearing stacked notifications.
self.addEventListener("notificationclose", () => {
  // no-op for now; future: analytics on dismissed reminders.
});

async function processQueue() {
  const db = await openMutationDB();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  const store = tx.objectStore(MUTATION_STORE);
  const allReq = store.getAll();

  return new Promise((resolve) => {
    allReq.onsuccess = async () => {
      const mutations = allReq.result || [];
      const keys = await new Promise((res) => {
        const kReq = store.getAllKeys();
        kReq.onsuccess = () => res(kReq.result || []);
      });

      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        try {
          await fetch(m.url, {
            method: m.method,
            headers: m.headers,
            body: m.body,
          });
          // Delete successful mutation
          store.delete(keys[i]);
        } catch (e) {
          // Still offline, leave in queue for next sync
          break;
        }
      }
      // Notify clients that sync completed
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "abhyas-sync-complete" }));
      resolve();
    };
  });
}
