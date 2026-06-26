import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Centralized error logging utility.
 * In development: Logs error to console.
 * In production: Writes error details to Firestore 'errorLogs' collection.
 */
export function logError(error: unknown, context: string): void {
  const isError = error instanceof Error;
  const message = isError ? error.message : String(error);
  const stack = isError ? error.stack : undefined;
  const userId = auth.currentUser?.uid || 'anonymous';
  const userAgent = navigator.userAgent;
  const timestamp = new Date().toISOString();

  if (import.meta.env.DEV) {
    console.error(
      `%c[Error Logger] Context: ${context}`,
      'color: #ff4444; font-weight: bold; font-size: 1.1em;',
      '\nMessage:',
      message,
      '\nStack:',
      stack || 'No stack trace'
    );
  }

  if (import.meta.env.PROD) {
    addDoc(collection(db, 'errorLogs'), {
      userId,
      message,
      stack: stack || null,
      context,
      timestamp,
      serverTime: serverTimestamp(),
      userAgent,
    }).catch((logErr) => {
      console.warn('Failed to log error to Firestore:', logErr);
    });
  }
}
