import { getToken, onMessage } from 'firebase/messaging';
import { db, messagingPromise } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

// Public VAPID key from Firebase Console -> Settings -> Cloud Messaging -> Web Push certificates
// Can be configured via VITE_FCM_VAPID_KEY environment variable
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

export async function requestNotificationPermission(): Promise<string | null> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return null;
  }

  const messaging = await messagingPromise;
  if (!messaging) {
    console.warn('FCM messaging is not supported in this browser.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, VAPID_KEY ? { vapidKey: VAPID_KEY } : undefined);
    return token;
  } catch (error) {
    console.error('Error requesting notification permission or getting token:', error);
    return null;
  }
}

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    // Store token in the user's tokens array so we can send to all user devices
    await setDoc(userDocRef, {
      tokens: arrayUnion(token)
    }, { merge: true });
    console.log('FCM token saved successfully for user:', userId);
  } catch (error) {
    console.error('Failed to save FCM token:', error);
  }
}

export async function onForegroundMessage(callback: (payload: any) => void): Promise<() => void> {
  const messaging = await messagingPromise;
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Received foreground message:', payload);
    callback(payload);
  });
}
