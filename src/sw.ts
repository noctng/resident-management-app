/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// --- Workbox Precache ---
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// --- Navigation Route ---
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// --- Runtime Caching ---
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
);

registerRoute(
  /\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
);

// --- Push Notification Handlers ---
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: { url?: string };
  };
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Thông báo', body: event.data.text() };
  }

  const options: Record<string, unknown> = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
    tag: data.tag || 'default',
    vibrate: [200, 100, 200],
    data: { url: data.url || data.data?.url || '/' },
    actions: [
      { action: 'open', title: 'Mở ứng dụng' },
      { action: 'close', title: 'Đóng' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Thông báo', options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = (event.notification.data as any)?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          (client as WindowClient).navigate(urlToOpen);
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (_event: NotificationEvent) => {
  // Optional: track notification dismissals
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Claim clients immediately
self.skipWaiting();
