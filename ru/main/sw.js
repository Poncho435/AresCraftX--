// AresCraftX — Service Worker (PWA + Push)
const CACHE_NAME = 'arescraftx-v3';
const OFFLINE_URL = '/ru/main/offline.html';

const PRECACHE_URLS = [
    '/ru/main/index.html',
    '/ru/main/res/v.css',
    '/ru/main/res/b.css',
    '/ru/main/res/n.css',
    '/ru/main/res/l.css',
    '/ru/main/res/c.css',
    '/ru/main/res/p.css',
    '/ru/main/res/o.css',
    '/ru/main/res/r.css',
    '/ru/main/security.js',
    '/ru/main/mod/i.js',
    '/ru/main/offline.html',
    '/ru/assets/logo.png'
];

// Install — pre-cache critical resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase') || 
        url.hostname.includes('mcsrvstat') || 
        url.hostname.includes('qrserver') ||
        url.hostname.includes('cloudflare') ||
        url.hostname.includes('jsdelivr')) {
        return;
    }

    event.respondWith(
        fetch(event.request).then(response => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then(cached => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
                return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});

// Push notifications handler
self.addEventListener('push', event => {
    let data = { title: 'AresCraftX', body: 'Новое уведомление', icon: '/ru/assets/logo.png' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body || '',
            icon: data.icon || '/ru/assets/logo.png',
            badge: '/ru/assets/logo.png',
            vibrate: [100, 50, 100],
            data: { url: data.url || '/' }
        })
    );
});

// Notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                clientList[0].focus();
                return;
            }
            self.clients.openWindow(event.notification.data?.url || '/');
        })
    );
});
