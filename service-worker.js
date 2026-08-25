const CACHE_NAME = 'people-i-meet-shell-v2';
const APP_FILES = ['./', './index.html', './styles.css', './app.js', './supabase-config.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(saved => saved || fetch(event.request)));
});
