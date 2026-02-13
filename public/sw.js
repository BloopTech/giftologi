/**
 * Giftologi — Unified Service Worker
 *
 * Responsibilities:
 *   1. Precache the offline fallback page on install
 *   2. Cache-first for static assets (images, fonts, CSS, JS)
 *   3. Network-first for navigations, with offline fallback
 *   4. Stale-while-revalidate for API/data requests
 *   5. Web Push notification handling (push, click, subscription change)
 *   6. Skip-waiting on message from client
 */

const CACHE_VERSION = "giftologi-v1";
const OFFLINE_URL = "/offline";

// ──────────────────────────────────────────────
// 1. Install — precache critical assets
// ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll([
        OFFLINE_URL,
        "/android-chrome-192x192.png",
        "/android-chrome-512x512.png",
        "/giftologi-logo.png",
      ])
    )
  );
});

// ──────────────────────────────────────────────
// 2. Activate — clean old caches, claim clients
// ──────────────────────────────────────────────
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
      .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────
// 3. Fetch — strategy per request type
// ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip Next.js HMR / webpack in dev
  if (url.pathname.startsWith("/_next/webpack")) return;

  // A) Navigation requests — network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations for offline use
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // B) Static assets — cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // C) API / data — stale-while-revalidate
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);

          return cached || networkFetch;
        })
      )
    );
    return;
  }
});

// ──────────────────────────────────────────────
// 4. Skip waiting on client message
// ──────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ──────────────────────────────────────────────
// 5. Web Push — push event
// ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Giftologi", body: "You have a new notification." };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    // fallback to default
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/android-chrome-192x192.png",
    badge: data.badge || "/android-chrome-192x192.png",
    tag: data.tag || "giftologi-notification",
    data: {
      url: data.url || "/",
    },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ──────────────────────────────────────────────
// 6. Notification click
// ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ──────────────────────────────────────────────
// 7. Push subscription change
// ──────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
