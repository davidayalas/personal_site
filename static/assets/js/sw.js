self.addEventListener('fetch', (event) => {
  // passthrough (no cache aún)
});

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  clients.claim();
});