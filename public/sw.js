// অভ্যাস Service Worker — offline-first caching for the PWA.
// Strategy:
//  - precache: app shell (/, manifest, icon)
//  - runtime cache (stale-while-revalidate): same-origin GET (Next.js assets, /api)
//  - network-first for /api/* with cache fallback (fresh data when online)
//  - opaque fallback for the Aladhan prayer-times API

const CACHE_VERSION = "abhyas-v3";
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
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip Next.js HMR + dev-only requests
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

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
