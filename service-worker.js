const CACHE_NAME = "contest-platform-v1";
const urlsToCache = [
  "/",
  "/home.html",
  "/index.css",
  "/index.js",
  "/manifest.json"
];

// Встановлення SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Під час запитів
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
