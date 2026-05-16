import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

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

export type StorageCategory = 'photos' | 'problems' | 'solutions' | 'diagnostics';

function buildPath(userId: string, carId: string, category: StorageCategory, recordId: string, fileName: string): string {
  return `${userId}/${carId}/${category}/${recordId}/${fileName}`;
}

function buildTempPath(userId: string, fileName: string): string {
  return `${userId}/temp/${fileName}`;
}

/**
 * Upload a file to the temp folder. Returns the storage path and download URL.
 */
export async function uploadToTemp(userId: string, file: File): Promise<{ storagePath: string; downloadUrl: string }> {
  // Add timestamp prefix to avoid name collisions
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = buildTempPath(userId, fileName);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Upload a file from base64 data to the temp folder.
 */
export async function uploadBase64ToTemp(userId: string, base64Data: string, mimeType: string, fileName: string): Promise<{ storagePath: string; downloadUrl: string }> {
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
  
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Upload a file directly to a permanent path. Returns the storage path and download URL.
 */
export async function uploadToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string }> {
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = buildPath(userId, carId, category, recordId, fileName);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

/**
 * Upload base64 data directly to a permanent path.
 */
export async function uploadBase64ToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<{ storagePath: string; downloadUrl: string }> {
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
  
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
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
): Promise<{ storagePath: string; downloadUrl: string }> {
  const tempRef = ref(storage, tempPath);
  
  // Get the download URL and fetch the file
  const tempUrl = await getDownloadURL(tempRef);
  const response = await fetch(tempUrl);
  const blob = await response.blob();
  
  // Extract original filename from temp path
  const originalName = tempPath.split('/').pop() || 'file';
  const storagePath = buildPath(userId, carId, category, recordId, originalName);
  const newRef = ref(storage, storagePath);
  
  await uploadBytes(newRef, blob);
  const downloadUrl = await getDownloadURL(newRef);
  
  // Delete the temp file
  try {
    await deleteObject(tempRef);
  } catch (err) {
    console.warn('Failed to delete temp file:', err);
  }
  
  return { storagePath, downloadUrl };
}

/**
 * Delete a file from storage by its path.
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Failed to delete storage file:', err);
  }
}

/**
 * Delete all files in a storage folder.
 */
export async function deleteFolder(folderPath: string): Promise<void> {
  if (!folderPath) return;
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    await Promise.all(result.items.map(item => deleteObject(item)));
    // Recursively delete sub-folders
    await Promise.all(result.prefixes.map(prefix => deleteFolder(prefix.fullPath)));
  } catch (err) {
    console.warn('Failed to delete folder:', err);
  }
}

/**
 * Upload a File object directly to a permanent path (for diagnostic files).
 */
export async function uploadFileToPermanent(
  userId: string,
  carId: string,
  category: StorageCategory,
  recordId: string,
  file: File
): Promise<{ storagePath: string; downloadUrl: string; fileName: string }> {
  const safeName = `${Date.now()}_${file.name}`;
  const storagePath = buildPath(userId, carId, category, recordId, safeName);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl, fileName: file.name };
}
