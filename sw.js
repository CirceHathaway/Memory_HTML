const CACHE_NAME = 'emoji-memory-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './funcionalidad.js',
  './manifest.json',
  './icon.png',
  // Quitamos CDN externos para evitar errores CORS en la instalación del SW
  // El navegador gestionará su propia caché HTTP para estos recursos si es posible
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // console.log('[SW] Cacheando archivos locales...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Estrategia: Cache First, falling back to Network
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => {
          // Fallback opcional (podría ser una página offline.html)
      });
    })
  );
});