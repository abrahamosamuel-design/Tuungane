// Tuungane app service worker.
// Provides basic static-asset caching, safe update semantics, and an offline
// fallback page. Sensitive data (messages, API responses, user info) is never
// cached — only static shell assets and the offline page.

importScripts('/sw-push.js');

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Wipe ALL caches to rescue users stuck on old/broken versions
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // Always go to the network directly to prevent stale blank screens
  event.respondWith(fetch(event.request));
});
