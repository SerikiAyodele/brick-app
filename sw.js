// offline copy of the app: try the network first (so updates show up),
// fall back to the saved copy when there is no signal. your data is not
// here, it stays in the phone's localStorage.
const CACHE = 'brick-v5';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}).then(() => self.skipWaiting()));
});
// drop older saved copies, and take over open pages straight away
// older copies are only dropped once the new one holds the page, so there is always something to open
self.addEventListener('activate', e => e.waitUntil(
  caches.open(CACHE).then(c => c.match('index.html')).then(ok => ok ? caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
                                                            : null).catch(() => {}).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const page = r.mode === 'navigate';
  e.respondWith((async () => {
    try {
      let res = null;
      if (page) {
        // a throwaway query so GitHub's servers cannot hand back an old copy
        const u = new URL(r.url); u.searchParams.set('fresh', Date.now());
        try { res = await fetch(u.href, { cache: 'no-store' }); } catch { res = null; }
        if (!res || !res.ok) res = await fetch(r);
        // Safari will not show a page the service worker got through a redirect: hand it a clean copy
        if (res.redirected) res = new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
      } else {
        res = await fetch(r, { cache: 'no-store' });
      }
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(page ? 'index.html' : r, copy)).catch(() => {}); }
      return res;
    } catch {
      return (await caches.match(r, { ignoreSearch: true })) || (await caches.match('index.html', { ignoreSearch: true })) || (await caches.match('./')) ||
        new Response('<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#000;color:#aaa;font:16px -apple-system,sans-serif;padding:80px 24px;text-align:center">brick can\u2019t reach the internet right now.<br><br>Check your connection and open it again.</body>', { headers: { 'Content-Type': 'text/html' } });
    }
  })());
});
