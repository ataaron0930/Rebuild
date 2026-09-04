/* Caches the app so it opens with no signal — hotel rooms, airplanes, gyms in basements.
   v4: bumped so the phone picks up the forced-save fix. The page itself stays
   NETWORK-FIRST, so future fixes land on the next open instead of being pinned
   behind the cache. Everything else stays cache-first. */
const CACHE = 'rebuild-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isPage(req) {
  return req.mode === 'navigate' || (req.destination === 'document') ||
         /\/(index\.html)?$/.test(new URL(req.url).pathname);
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // The app shell: try the network, fall back to cache when there is no signal.
  if (isPage(e.request)) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // Everything else: cache first.
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
