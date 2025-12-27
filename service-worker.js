// Service Worker for St. Rita Parish
const CACHE_NAME = 'st-rita-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/about.html',
  '/admin.html',
  '/announcements-events.html',
  '/contact.html',
  '/daily-readings.html',
  '/gallery.html',
  '/groups-ministries.html',
  '/mass-sacraments.html',
  '/parish-history.html',
  '/st-rita-history.html',
  '/styles.css',
  '/gallery.css',
  '/gallery.js',
  '/app.js',
  '/announcements.json',
  '/events.json',
  '/readings.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
