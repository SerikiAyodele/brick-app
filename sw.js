// offline copy of the app: try the network first (so updates show up),
// fall back to the saved copy when there is no signal. your data is not
// here, it stays in the phone's localStorage.
const CACHE = 'brick-v3';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // no-store: skip the browser's own cache too, so a new version shows straight away
  // the page itself: add a throwaway query so GitHub's servers cannot hand back an old copy
  const page = r.mode === 'navigate' || /(\/|\.html)$/.test(new URL(r.url).pathname);
  const u = new URL(r.url); if (page) u.searchParams.set('fresh', Date.now());
  e.respondWith(fetch(page ? u.href : r, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
});
