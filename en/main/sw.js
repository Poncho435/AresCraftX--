// AresCraftX — Service Worker (PWA + Push)
const CACHE_NAME = 'arescraftx-v3';
const OFFLINE_URL = '/en/main/offline.html';

const PRECACHE_URLS = [
    '/en/main/index.html',
    '/en/main/res/v.css',
    '/en/main/res/b.css',
    '/en/main/res/n.css',
    '/en/main/res/l.css',
    '/en/main/res/c.css',
    '/en/main/res/p.css',
    '/en/main/res/o.css',
    '/en/main/res/r.css',
    '/en/main/security.js',
    '/en/main/mod/i.js',
    '/en/main/offline.html',
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
