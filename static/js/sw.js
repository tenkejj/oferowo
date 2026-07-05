const CACHE = 'sumit-shell-v6';

const SHELL_URLS = [
  '/',
  '/static/css/style.css',
  '/static/css/style-mobile.css',
  '/static/js/app.js',
  '/static/icons/pwa-192.png',
  '/static/icons/pwa-512.png',
  '/static/images/sumit-fish.png',
];

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
    || url.pathname === '/quote'
    || url.pathname === '/stats';
}

function isNetworkFirstStatic(pathname) {
  return pathname.endsWith('.css') || pathname.endsWith('.js');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (url.pathname.startsWith('/static/')) {
    if (isNetworkFirstStatic(url.pathname)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match(event.request)),
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
        return cached || network;
      }),
    );
  }
});
