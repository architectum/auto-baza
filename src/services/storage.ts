import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { withErrorHandling, retryAsync, ServiceResult } from '../shared/lib/serviceResult';

/**
 * Firebase Storage service module.
 * 
 * Storage structure:
 *   {userId}/temp/{filename}
 *   {userId}/{carId}/photos/{recordId}/{filename}
 *   {userId}/{carId}/problems/{historyEntryId}/{filename}
 *   {userId}/{carId}/solutions/{historyEntryId}/{filename}
 *   {userId}/{carId}/diagnostics/{fileDocId}/{filename}
 */

export type StorageCategory = 'photos' | 'problems' | 'solutions' | 'diagnostics' | 'avatar';

export interface UploadProgressObservable {
  subscribe: (callback: (progress: number) => void) => () => void;
}

export interface UploadResult<T> {
  progress: UploadProgressObservable;
  result: Promise<ServiceResult<T>>;
}

function buildPath(userId: string, carId: string, category: StorageCategory, recordId: string, fileName: string): string {
  return `${userId}/${carId}/${category}/${recordId}/${fileName}`;
}

function buildTempPath(userId: string, fileName: string): string {
  return `${userId}/temp/${fileName}`;
}

/**
 * Helper to run a resumable upload task and return progress + result
 */
function createUploadTask<T extends { storagePath: string; downloadUrl: string }>(
  storagePath: string,
  storageRef: any,
  data: Blob | Uint8Array | ArrayBuffer,
  mimeType?: string,
  extraData?: (payload: { storagePath: string; downloadUrl: string }) => T
): UploadResult<T> {
  let progressCallbacks: ((p: number) => void)[] = [];
  let progressVal = 0;

  const progress: UploadProgressObservable = {
    subscribe: (callback) => {
      progressCallbacks.push(callback);
      callback(progressVal);
      return () => {
        progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
      };
    }
  };

  const notify = (p: number) => {
    progressVal = p;
    progressCallbacks.forEach(cb => cb(p));
  };

  const metadata = mimeType ? { contentType: mimeType } : undefined;

  const resultPromise = withErrorHandling(async () => {
    return retryAsync(async () => {
      return new Promise<T>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, data, metadata);
        
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const p = snapshot.totalBytes > 0 
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) 
              : 0;
            notify(p);
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              const payload = { storagePath, downloadUrl };
              resolve(extraData ? extraData(payload) : (payload as T));
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    }, { maxRetries: 3, delay: 1000, backoff: 2 });
  }, 'uploadTask');

  return { progress, result: resultPromise };
}

/**
 * Upload a file to the temp folder. Returns the storage path and download URL.
 */
export function uploadToTemp(
  userId: string, 
  file: File
): UploadResult<{ storagePath: string; downloadUrl: string }> {
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = buildTempPath(userId, fileName);
  const storageRef = ref(storage, storagePath);
  return createUploadTask(storagePath, storageRef, file, file.type);
}

/**
 * Upload a file from base64 data to the temp folder.
 */
export function uploadBase64ToTemp(
  userId: string,
  base64Data: string,
  mimeType: string,
  fileName: string
): UploadResult<{ storagePath: string; downloadUrl: string }> {
  const safeName = `${Date.now()}_${fileName}`;
  const storagePath = buildTempPath(userId, safeName);
  const storageRef = ref(storage, storagePath);
  
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  return createUploadTask(storagePath, storageRef, blob, mimeType);
}

/**
 * Upload a file directly to a permanent path. Returns the storage path and download URL.
 */
export function uploadToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  file: File
): UploadResult<{ storagePath: string; downloadUrl: string }> {
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = buildPath(userId, carId, category, recordId, fileName);
  const storageRef = ref(storage, storagePath);
  return createUploadTask(storagePath, storageRef, file, file.type);
}

/**
 * Upload base64 data directly to a permanent path.
 */
export function uploadBase64ToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  base64Data: string,
  mimeType: string,
  fileName: string
): UploadResult<{ storagePath: string; downloadUrl: string }> {
  const safeName = `${Date.now()}_${fileName}`;
  const storagePath = buildPath(userId, carId, category, recordId, safeName);
  const storageRef = ref(storage, storagePath);
  
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  return createUploadTask(storagePath, storageRef, blob, mimeType);
}

/**
 * Move a file from temp to a permanent location.
 * Firebase Storage has no native "move" — we download and re-upload.
 */
export async function moveFromTemp(
  tempPath: string,
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string
): Promise<ServiceResult<{ storagePath: string; downloadUrl: string }>> {
  return withErrorHandling(async () => {
    return retryAsync(async () => {
      const tempRef = ref(storage, tempPath);
      
      // Get the download URL and fetch the file
      const tempUrl = await getDownloadURL(tempRef);
      const response = await fetch(tempUrl);
      const blob = await response.blob();
      
      // Extract original filename from temp path
      const originalName = tempPath.split('/').pop() || 'file';
      const storagePath = buildPath(userId, carId, category, recordId, originalName);
      const newRef = ref(storage, storagePath);
      
      // We don't track progress for moving temp files as it's an internal admin step
      // and we just use the simple uploadBytes internally (but we'll import and use uploadBytesResumable just in case, or just simple uploadTask)
      const uploadTask = uploadBytesResumable(newRef, blob);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, () => resolve());
      });
      const downloadUrl = await getDownloadURL(newRef);
      
      // Delete the temp file
      try {
        await deleteObject(tempRef);
      } catch (err) {
        console.warn('Failed to delete temp file:', err);
      }
      
      return { storagePath, downloadUrl };
    }, { maxRetries: 3, delay: 1000, backoff: 2 });
  }, 'moveFromTemp');
}

/**
 * Delete a file from storage by its path.
 */
export async function deleteFromStorage(storagePath: string): Promise<ServiceResult<void>> {
  return withErrorHandling(async () => {
    if (!storagePath) return;
    return retryAsync(async () => {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }, { maxRetries: 3, delay: 1000, backoff: 2 });
  }, 'deleteFromStorage');
}

/**
 * Delete all files in a storage folder.
 */
export async function deleteFolder(folderPath: string): Promise<ServiceResult<void>> {
  return withErrorHandling(async () => {
    if (!folderPath) return;
    return retryAsync(async () => {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map(item => deleteObject(item)));
      // Recursively delete sub-folders
      await Promise.all(result.prefixes.map(prefix => {
        return deleteFolder(prefix.fullPath).then(res => {
          if (res.error) throw res.error;
        });
      }));
    }, { maxRetries: 3, delay: 1000, backoff: 2 });
  }, 'deleteFolder');
}

/**
 * Upload a File object directly to a permanent path (for diagnostic files).
 */
export function uploadFileToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  file: File
): UploadResult<{ storagePath: string; downloadUrl: string; fileName: string }> {
  const safeName = `${Date.now()}_${file.name}`;
  const storagePath = buildPath(userId, carId, category, recordId, safeName);
  const storageRef = ref(storage, storagePath);
  return createUploadTask(
    storagePath, 
    storageRef, 
    file, 
    file.type, 
    (payload) => ({ ...payload, fileName: file.name })
  );
}

/**
 * List all files in a specific folder.
 */
export async function listFolderFiles(
  folderPath: string
): Promise<ServiceResult<{ storagePath: string; downloadUrl: string }[]>> {
  return withErrorHandling(async () => {
    return retryAsync(async () => {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);
      const files = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { storagePath: item.fullPath, downloadUrl: url };
        })
      );
      return files;
    }, { maxRetries: 3, delay: 1000, backoff: 2 });
  }, 'listFolderFiles');
}
