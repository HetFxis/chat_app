// pushSubscription.js
import api from '../../utils/auth';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i=0; i<rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function subscribeUser() {
  try {
    // Check if browser supports service workers and push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Request notification permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return false;
    }

    // Register service worker
    console.log('Registering service worker...');
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
    console.log('Service worker registered');

    // Get VAPID public key from backend
    console.log('Getting VAPID public key...');
    const response = await api.get('/api/vapid-public-key');
    const vapidPublicKey = response.data.publicKey;
    console.log('VAPID public key received:', vapidPublicKey);

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Unsubscribing from existing subscription...');
      await existingSubscription.unsubscribe();
    }

    // Subscribe to push notifications
    console.log('Subscribing to push notifications...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    console.log('Push subscription created:', subscription);

    // Send subscription to backend
    console.log('Sending subscription to backend...');
    await api.post('/api/subscribe', subscription);
    
    console.log('Push subscription successful!');
    
    // Test notification
    if (Notification.permission === 'granted') {
      new Notification('Push Notifications Enabled!', {
        body: 'You will now receive notifications for new messages',
        icon: '/icon-192x192.png'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

export async function unsubscribeUser() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Unsubscribe from push
      await subscription.unsubscribe();
      
      // Notify backend
      await api.delete('/api/unsubscribe', {
        data: { endpoint: subscription.endpoint }
      });
      
      console.log('Push unsubscription successful');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

export async function checkSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check push subscription:', error);
    return false;
  }
}