/**
 * WADL service worker.
 * - Receives `push` events and shows a notification.
 * - Handles `notificationclick` to focus or open the URL in payload.
 *
 * Registered from /owner/profile via PushSubscribeButton.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
    icon: data.icon || "/icon.png",
    badge: data.icon || "/icon.png",
    tag: data.tag,
    data: { url: data.url || "/owner/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/owner/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
