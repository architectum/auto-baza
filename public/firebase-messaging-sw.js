importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCFtXF7fb9vjzKaWoaG1sjgX35UEt_VENc",
  authDomain: "auto-baza.firebaseapp.com",
  projectId: "auto-baza",
  storageBucket: "auto-baza.firebasestorage.app",
  messagingSenderId: "285988081348",
  appId: "1:285988081348:web:f467a1480f6694ebd80391"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification ? payload.notification.title : 'Повідомлення';
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : '',
    icon: '/pwa-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(self.location.origin);
  if (event.notification.data && event.notification.data.carId) {
    urlToOpen.hash = `#/car/${event.notification.data.carId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen.href && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen.href);
      }
    })
  );
});
