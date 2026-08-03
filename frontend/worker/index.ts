/// <reference lib="webworker" />

export const _worker = true;

// Listen for incoming Web Push notifications
(self as any).addEventListener('push', (event: any) => {
  let title = 'AuDHD Life Tracker';
  let body = 'New notification received';
  let icon = '/icon-192x192.png';
  let url = '/';
  let payloadData: any = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && typeof payload === 'object') {
        const notification = payload.notification || payload;
        title = notification.title || payload.title || title;
        body = notification.body || payload.body || body;
        icon = notification.icon || payload.icon || icon;
        url = notification.url || payload.url || notification.data?.url || payload.data?.url || url;
        
        if (payload.notification) {
          payloadData = payload.notification.data || payload.data || {};
        } else {
          payloadData = payload.data || payload;
        }
      }
    } catch (_err) {
      // Fallback for plain text or non-JSON payloads
      try {
        const textData = event.data.text();
        if (textData) {
          body = textData;
        }
      } catch (_textErr) {
        // Keep default body
      }
    }
  }

  const options: any = {
    body,
    icon,
    data: {
      url,
      ...payloadData,
    },
  };

  event.waitUntil((self as any).registration.showNotification(title, options));
});

// Listen for notification click events
(self as any).addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  const promiseChain = (self as any).clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList: any) => {
      // Check if a window client matching target URL is already open
      for (const client of clientList) {
        if ('focus' in client && typeof client.focus === 'function') {
          if (client.url === urlToOpen || client.url.endsWith(urlToOpen)) {
            return client.focus();
          }
        }
      }

      // If any window client is open, focus it
      if (clientList.length > 0 && 'focus' in clientList[0] && typeof clientList[0].focus === 'function') {
        return clientList[0].focus();
      }

      // Otherwise open a new window
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});
