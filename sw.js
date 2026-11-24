/* Service worker: app utilizzabile offline. I file dell'app vanno in cache all'installazione e si aggiornano a ogni nuova versione. */
const VERSIONE = 'segregazione-1.0-beta-1';
const APP = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/imdg.js', 'js/regole.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'img/logo-scp.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSIONE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
