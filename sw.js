/* =============================================================================
   Finanz-Cockpit – Service Worker
   Sorgt dafür, dass die App auch offline startet.

   - Die App-Seite (index.html) wird online immer frisch geladen, damit neue
     Versionen sofort ankommen. Offline kommt sie aus dem Zwischenspeicher.
   - Anfragen an andere Adressen (z. B. die Claude-API) werden nie angefasst
     und nie zwischengespeichert.
   - Nach Änderungen an Icons oder Manifest CACHE_VERSION erhöhen.
   ============================================================================= */
const CACHE_VERSION = 'finanzcockpit-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Nur eigene GET-Anfragen behandeln – alles andere geht unverändert ins Netz
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // App-Seite: Netz zuerst, Zwischenspeicher als Rückfallebene
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Icons, Manifest: Zwischenspeicher zuerst
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
