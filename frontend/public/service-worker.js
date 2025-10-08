// Service Worker for Push Notifications

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('Push notification has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Failed to parse push data:', e);
    return;
  }

  const notification = data.notification || {};
  const title = notification.title || 'New Message';
  const options = {
    body: notification.body || 'You have a new message',
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    vibrate: notification.vibrate || [100, 50, 100],
    data: notification.data || {},
    tag: notification.tag || 'chat-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  // Check if any client (tab) is focused
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if chat is focused
        const chatFocused = clientList.some(client => 
          client.url.includes('/chat') && client.focused
        );
        
        // Only show notification if chat is not focused
        if (!chatFocused) {
          return self.registration.showNotification(title, options);
        } else {
          console.log('Chat is focused, skipping notification');
        }
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the chat window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if chat is already open
        for (const client of clientList) {
          if (client.url.includes('/chat') && 'focus' in client) {
            return client.focus();
          }
        }
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow('/chat');
        }
      })
  );
});

// Message event - Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - Optional: Cache strategies can be added here
self.addEventListener('fetch', (event) => {
  // For now, just pass through all requests
  // You can add caching strategies here if needed
  return;
});
