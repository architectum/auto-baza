/**
 * Offline Queue Service using IndexedDB for managing offline media uploads
 * and synchronizing them when connection is restored.
 */
import { uploadToPermanent } from './storage';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

const DB_NAME = 'AutoBazaOfflineDB';
const STORE_NAME = 'pendingUploads';
const DB_VERSION = 1;

export interface PendingUpload {
  entryId: string;
  carId: string;
  userId: string;
  category: string;
  files: {
    name: string;
    type: string;
    base64: string;
  }[];
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'entryId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Convert a File object to Base64 helper
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Convert Base64 back to a File object helper
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const arr = base64.split(',');
  const match = arr[0].match(/:(.*?);/);
  const mime = match ? match[1] : mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function queuePendingUpload(upload: PendingUpload): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(upload);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to queue offline upload:', err);
  }
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get pending uploads:', err);
    return [];
  }
}

export async function removePendingUpload(entryId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(entryId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to remove pending upload:', err);
  }
}

/**
 * Synchronize all pending offline uploads to Firebase Storage
 */
export async function syncOfflineQueue(onProgress?: (msg: string) => void): Promise<number> {
  if (!navigator.onLine) return 0;
  
  const pending = await getPendingUploads();
  if (pending.length === 0) return 0;

  console.log(`Syncing ${pending.length} pending offline uploads...`);
  let successCount = 0;

  for (const upload of pending) {
    try {
      if (onProgress) {
        onProgress(`Завантажуємо файли для запису...`);
      }
      
      const filesToUpload = upload.files.map(f => 
        base64ToFile(f.base64, f.name, f.type)
      );

      const uploadTasks = filesToUpload.map(file => 
        uploadToPermanent(upload.userId, upload.carId, upload.category as any, upload.entryId, file)
      );
      
      const uploadResults = await Promise.all(uploadTasks.map(t => t.result));
      const failedUpload = uploadResults.find(r => r.error);
      
      if (failedUpload && failedUpload.error) {
        throw failedUpload.error;
      }

      const successfulUploads = uploadResults.map(r => r.data!);
      const fileUrls = successfulUploads.map(r => r.downloadUrl);
      const filePaths = successfulUploads.map(r => r.storagePath);
      
      const updatePayload: Record<string, any> = {
        fileUrls,
        filePaths,
        photoUrl: fileUrls[0] || '',
        photoPath: filePaths[0] || '',
        _pendingUpload: false // Clear the offline pending flag
      };

      // Update the document in Firestore
      await updateDoc(doc(db, 'cars', upload.carId, 'history', upload.entryId), updatePayload);
      
      // Remove from offline queue
      await removePendingUpload(upload.entryId);
      successCount++;
    } catch (err) {
      console.error(`Failed to sync upload for entry ${upload.entryId}:`, err);
    }
  }

  return successCount;
}
