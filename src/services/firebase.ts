import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.warn("Firestore persistence failed:", err.code);
});

export const auth = getAuth();
export const storage = getStorage(app);

export const analyticsPromise = isSupported().then(yes => yes ? getAnalytics(app) : null);

export const logEvent = async (eventName: string, eventParams?: any) => {
  const analytics = await analyticsPromise;
  if (analytics) {
    firebaseLogEvent(analytics, eventName, eventParams);
  }
};
