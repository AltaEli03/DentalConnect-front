/* Imported by vite-plugin-pwa's generated service worker. */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || '' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'DentalConnect', {
      body: payload.body || 'Tienes una actualización de tu cita.',
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      tag: payload.tag || 'dentalconnect-appointment',
      data: { url: payload.url || '/notificaciones' },
      renotify: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notificaciones', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    }),
  );
});
