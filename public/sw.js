const CACHE_NAME = "studyai-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin ||
    event.request.headers.has("range") ||
    event.request.destination === "audio" ||
    event.request.destination === "video"
  ) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/").then((cached) => {
      if (!cached) throw new Error("The offline StudyAI app shell is not cached.");
      return cached;
    })));
    return;
  }

  if (!["script", "style", "image", "font"].includes(event.request.destination)) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(async (error) => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw error;
    }),
  );
});
