// SubShuffle Service Worker for Offline Pitch Usage
const CACHE_NAME = 'subshuffle-offline-v4';
const STATIC_ASSETS = [
  '/',
  '/lineup',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching assets error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging legacy service worker cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Only intercept HTTP/HTTPS GET requests.
  // The Cache API throws a TypeError if given POST, PUT, DELETE, PATCH, etc.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Never intercept backend API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Only intercept same-origin assets or Google Fonts stylesheets/webfonts.
  // External APIs (Firebase Auth, Firestore, analytics, OAuth, etc.) must bypass service worker.
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isGoogleFont) {
    return;
  }

  // 4. Navigation requests (HTML): Network-First with Offline Cache Fallback.
  // CRITICAL: When online, ALWAYS fetch fresh index.html from server so the browser
  // receives current Vite asset hashes and never requests deleted legacy chunks.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch((err) => console.warn('Cache put failed on navigation:', err));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 5. Static assets (/assets/**): Cache-First, then network.
  // Hashed Vite assets are immutable. Never cache a fallback index.html as a script or stylesheet!
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          const contentType = networkResponse.headers.get('content-type') || '';
          // Only cache real asset responses, NOT SPA fallback HTML
          if (networkResponse.status === 200 && !contentType.includes('text/html') && event.request.method === 'GET') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch((err) => console.warn('Cache put failed on asset:', err));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 6. Other static assets (icons, fonts, manifest)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch((err) => console.warn('Cache put failed on static asset:', err));
          }
          return networkResponse;
        })
      );
    })
  );
});
