/* Scottish Country Attitude service worker.
   Bump VERSION whenever you change any file so installed apps pick it up. */
const VERSION = 'sca-v4';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'images/born.webp', 'images/pets.webp', 'images/quotes.webp', 'images/emblem.webp',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'pwa.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache payment or API traffic (needed once the backend / Stripe exists)
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('stripe.com')) return;

  // Page loads: network first, fall back to the cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Everything else (own files and Google Fonts): serve cached copy, refresh in background
  if (url.origin === location.origin || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
