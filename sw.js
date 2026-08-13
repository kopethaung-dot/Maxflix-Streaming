/**
 * Maxflix Streaming — Service Worker
 * =============================================================
 * STRATEGY
 *   - index.html / navigation requests → NETWORK-FIRST. This is the file
 *     that changes on every deploy (new features, bug fixes, ad banners,
 *     etc.), so it must never be served stale just because this sw.js
 *     file itself didn't change. We always try the network first and
 *     only fall back to the cached copy if the device is offline.
 *   - manifest.json / icons (app shell chrome) → CACHE-FIRST, since
 *     these rarely change and cache-first makes repeat/offline loads
 *     instant.
 *   - Firestore/Firebase API calls and video files (R2/CDN) → always
 *     network, never cached — this site's movie data and video files
 *     change constantly and must never be served stale or offline.
 *
 * NOTE: because HTML is now network-first, you generally do NOT need to
 * bump CACHE_NAME on every content update anymore. Bump it only if you
 * change the STATIC_SHELL list below (e.g. add/rename an icon file).
 */

const CACHE_NAME = 'maxflix-shell-v3';
const STATIC_SHELL = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_SHELL)).catch(() => {})
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
  const req = event.request;
  const url = new URL(req.url);

  // Firestore/Firebase API calls and video files (R2/CDN) — always network, never cache
  if(url.hostname.includes('firestore.googleapis.com') ||
     url.hostname.includes('googleapis.com') ||
     url.hostname.includes('r2.dev') ||
     url.hostname.includes('r2.cloudflarestorage.com') ||
     url.hostname.includes('cdn.maxflixstream.com') ||
     req.method !== 'GET'){
    return; // let the browser handle it normally
  }

  // Page navigations + index.html — NETWORK-FIRST so every deploy reaches
  // installed PWAs immediately. Falls back to the last-cached copy only
  // when the device is offline.
  const isHtmlRequest = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if(isHtmlRequest){
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Everything else in the static shell (manifest, icons) — cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => cached))
  );
});
