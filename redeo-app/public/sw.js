const CACHE_NAME = 'redeo-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.hostname.includes('supabase.co')) return;

  if (event.request.mode === 'navigate') {
    // Network first, but never make the user wait: fall back to the cached shell after 2.5s
    event.respondWith(
      new Promise((resolve) => {
        let settled = false;
        const useCache = () => caches.match('/index.html').then((r) => r || caches.match('/'));
        const timer = setTimeout(() => {
          useCache().then((r) => { if (r && !settled) { settled = true; resolve(r); } });
        }, 2500);
        fetch(event.request)
          .then((response) => {
            clearTimeout(timer);
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone)).catch(() => {});
            if (!settled) { settled = true; resolve(response); }
          })
          .catch(() => {
            clearTimeout(timer);
            useCache().then((r) => { if (!settled) { settled = true; resolve(r || Response.error()); } });
          });
      })
    );
    return;
  }

  // Hashed build assets never change → cache first (instant repeat loads)
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.destination === 'image') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
