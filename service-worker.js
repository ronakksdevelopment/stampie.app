/**
 * Stampie — Service Worker
 * ---------------------------------------------------------------------------
 * Caches the app shell for offline use. Codes.json is cached too but with a
 * network-first strategy so new codes added by the shop owner are picked up
 * as soon as the customer is back online.
 */

const CACHE_NAME = 'stampie-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './src/styles.css',
  './src/app.js',
  './src/ui.js',
  './src/storage.js',
  './src/codes.js',
  './src/scanner.js',
  './src/constants.js',
  './assets/final_logo.png',
  './assets/notxt_character_logo.png',
  './assets/text_banner.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch((err) => {
      console.error('Stampie SW: install cache failed', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-first for codes.json so new codes show up quickly when online
  if (url.pathname.endsWith('/data/codes.json') || url.pathname.endsWith('data/codes.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else in the app shell (and same-origin assets)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return undefined;
          });
      })
    );
  }
  // Cross-origin (fonts, CDN scripts) — just let the network handle it, browser caches normally.
});
