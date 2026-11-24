/* Service worker: app utilizzabile offline.
   - installazione: i file dell'app si scaricano dal server ignorando la cache HTTP del browser (cache: 'reload'),
     così una nuova versione non mescola file vecchi e nuovi;
   - uso: prima la rete (al massimo 4 s), poi la copia salvata; senza rete l'app funziona con i file salvati. */
const VERSIONE = 'segregazione-1.4-beta-1';
const APP = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/imdg.js', 'js/regole.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'img/logo-scp.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => Promise.all(APP.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => {
    if (!r.ok) throw new Error(u + ' ' + r.status); return c.put(u, r);
  })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(VERSIONE);
    try {
      const r = await Promise.race([fetch(e.request, { cache: 'no-cache' }), new Promise((_, ko) => setTimeout(() => ko(new Error('lenta')), 4000))]);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await c.match(e.request, { ignoreSearch: true })) || (await caches.match(e.request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
