// ত্রিপুরা প্রবাহ — Service Worker
const CACHE_NAME = 'tripura-probaho-v16';
const STATIC_ASSETS = [
    './',
    'index.html',
    'news.html',
    'category.html',
    'admin.html',
    'css/style.css',
    'app.js',
    'admin.js',
    'firebase-config.js',
    'manifest.json',
    'assets/images/icon.jpeg'
];

// Install — cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (!['http:', 'https:'].includes(url.protocol)) return;
    event.respondWith(
        fetch(event.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});

// Push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'ত্রিপুরা প্রবাহ';
    const options = {
        body: data.body || 'নতুন খবর আসছে...',
        icon: 'assets/images/icon.jpeg',
        badge: 'assets/images/icon.jpeg',
        data: { url: data.url || 'index.html' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
