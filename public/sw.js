/* Aloft service worker. Network first for pages so a deploy is never stale,
   cache first for hashed assets and models, and an offline page when the
   network is gone. Money never comes from the cache: API calls are not
   cached at all. */
// v5 drops the old study character's model from every device's cache.
const VERSION = 'aloft-v5-cat';
const SHELL = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/models/') ||
  url.pathname.startsWith('/icons/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((page) => page || Response.error()),
      ),
    );
  }
});

// The study cat's nudges. The server sends { title, body, url }; showing a
// notification for every push is what browsers require of us anyway.
self.addEventListener('push', (event) => {
  let message = { title: 'Aloft', body: 'Time to study!', url: '/study' };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // An empty or unreadable push still shows the plain nudge.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'study-cat',
      data: { url: message.url },
    }),
  );
});

// Tapping it opens the study tab, reusing an open Aloft window if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url ?? '/study',
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (
            client.url.startsWith(self.location.origin) &&
            'focus' in client
          ) {
            return client.navigate(url).then((c) => (c ?? client).focus());
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
