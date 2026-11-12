// Service worker: guarda os arquivos do app para funcionar offline.
// Ao mudar qualquer arquivo do site, aumente o número da versão abaixo.
const CACHE = 'sistema-v2';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Arquivos do próprio app: rede primeiro (pega atualizações), cache se estiver offline.
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
  // Fontes do Google e outros: deixa o navegador cuidar.
});
