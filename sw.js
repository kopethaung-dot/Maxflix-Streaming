/**
 * Maxflix Streaming — Service Worker
 * =============================================================
 * WHY THIS IS DELIBERATELY MINIMAL
 *   This site's content (Firestore movie data, R2 video files) changes
 *   constantly. Aggressively caching everything would risk showing stale
 *   movie lists or broken video links. So this worker ONLY caches the
 *   static "app shell" (this HTML file + icons) for fast repeat loads
 *   and installability — it deliberately does NOT cache Firestore API
 *   calls or video files, which always go straight to the network.
 */

const CACHE_NAME = 'maxflix-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firestore/Firebase API calls and video files (R2/CDN) — always network, never cache
  if(url.hostname.includes('firestore.googleapis.com') ||
     url.hostname.includes('googleapis.com') ||
     url.hostname.includes('r2.dev') ||
     url.hostname.includes('r2.cloudflarestorage.com') ||
     url.hostname.includes('cdn.maxflixstream.com') ||
     event.request.method !== 'GET'){
    return; // let the browser handle it normally
  }

  // App shell files — cache-first, so repeat visits/offline loads are instant
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});
