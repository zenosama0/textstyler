// Bump this when you change any cached file, so clients pick up the update
const CACHE_NAME = 'stylers-cache-v3';

// App shell — update this list when you add a new tool to /stylers
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './stylers/MD_Styler.html',
  './stylers/StudyFlow.html',
  './stylers/PDF_Reader.html',
  './stylers/Flashcards.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage){
    // Network-first for HTML — always tries to fetch the latest version first,
    // so edits show up on next reload instead of being stuck behind a stale cache.
    // Falls back to whatever's cached only when there's no connection.
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else if (isSameOrigin){
    // Cache-first for static assets (icons, manifest) — these rarely change
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    // Cross-origin (fonts/CDN scripts): try network, fall back to cache offline
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
