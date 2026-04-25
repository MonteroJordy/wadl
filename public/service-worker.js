/**
 * WADL service worker.
 * - Push notifications + click handlers (Day 12).
 * - Shell caching for "Add to Home Screen" PWA mode (Day 16): offline fallback
 *   for the icon, manifest, and a tiny offline page. Authed pages and Supabase
 *   data are NOT cached (network-first stays the right call for live state).
 */

const SHELL_CACHE = "wadl-shell-v1";
const SHELL_ASSETS = ["/manifest.json", "/icon.svg", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cache-first for shell assets.
  if (
    url.origin === self.location.origin &&
    SHELL_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Network-first navigations with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match("/offline.html")
          .then((c) => c || new Response("Offline", { status: 503 }))
      )
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "WADL", body: event.data.text() };
  }
  const title = data.title || "WADL";
  const opts = {
    body: data.body || "",
    icon: data.icon || "/icon.svg",
    badge: data.icon || "/icon.svg",
    tag: data.tag,
    data: { url: data.url || "/owner/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/owner/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if (w.url === url && "focus" in w) return w.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
