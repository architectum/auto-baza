import { useState, useEffect, useCallback } from 'react';
import { db } from '@services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, deleteField, writeBatch } from 'firebase/firestore';
import { HistoryEntry } from '@types';
import { uploadToPermanent, deleteFromStorage } from '@services/storage';

export function useHistory(
  carId: string | null, 
  userId: string, 
  currentMileage: number, 
  updateCarMileage: (mileage: number) => Promise<void>
) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(!!carId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!carId) {
      setHistory([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, 'cars', carId, 'history'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryEntry)));
      setLoading(false);
    }, err => {
      console.error('Failed to subscribe to history:', err);
      setError(err);
      setLoading(false);
    });

    return unsub;
  }, [carId]);

  const addEntry = useCallback(async (data: Partial<HistoryEntry>, photoFiles?: File[] | File) => {
    if (!carId) return;
    const now = new Date().toISOString();
    const isMileageEntry = data.type === 'mileage';

    if (isMileageEntry) {
      const newMileage = data.runtimeMileage || 0;
      const mileageDiff = newMileage - currentMileage;
      const histPayload: Record<string, any> = {
        type: 'mileage' as const,
        text: data.text || `Оновлено пробіг: ${newMileage} км`,
        runtimeMileage: newMileage,
        mileageDiff,
        authorId: userId,
        createdAt: now
      };
      await addDoc(collection(db, 'cars', carId, 'history'), histPayload);
      await updateCarMileage(newMileage);
    } else {
      const histPayload: Record<string, any> = {
        type: data.type || 'note',
        text: data.text || '',
        runtimeMileage: currentMileage,
        mileageDiff: 0,
        authorId: userId,
        createdAt: data.createdAt || now,
      };
      if (data.cost !== undefined) histPayload.cost = data.cost;
      if (data.spentHours !== undefined) histPayload.spentHours = data.spentHours;
      if (data.difficulty !== undefined) histPayload.difficulty = data.difficulty;

      const histDoc = await addDoc(collection(db, 'cars', carId, 'history'), histPayload);

      const filesToUpload = photoFiles ? (Array.isArray(photoFiles) ? photoFiles : [photoFiles]) : [];
      if (filesToUpload.length > 0) {
        const category = data.type === 'problem' ? 'problems' : data.type === 'solution' ? 'solutions' : 'photos';
        const uploadTasks = filesToUpload.map(file => 
          uploadToPermanent(userId, carId, category as any, histDoc.id, file)
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
        };
        await updateDoc(doc(db, 'cars', carId, 'history', histDoc.id), updatePayload);
      }
    }
  }, [carId, userId, currentMileage, updateCarMileage]);

  const updateEntry = useCallback(async (
    historyId: string, 
    data: Partial<HistoryEntry>, 
    newPhotoFiles?: File[] | File, 
    remainingFiles?: { url: string; path: string }[]
  ) => {
    if (!carId) return;
    const ref = doc(db, 'cars', carId, 'history', historyId);
    const entry = history.find(e => e.id === historyId);
    if (!entry) return;

    const updatePayload: Record<string, any> = {};
    if (data.type) updatePayload.type = data.type;
    if (data.text !== undefined) updatePayload.text = data.text;
    if (data.linkedSolutionId !== undefined) {
      updatePayload.linkedSolutionId = data.linkedSolutionId === '' ? deleteField() : data.linkedSolutionId;
    }
    if ('cost' in data) {
      updatePayload.cost = data.cost === undefined ? deleteField() : data.cost;
    }
    if ('spentHours' in data) {
      updatePayload.spentHours = data.spentHours === undefined ? deleteField() : data.spentHours;
    }
    if ('difficulty' in data) {
      updatePayload.difficulty = data.difficulty === undefined ? deleteField() : data.difficulty;
    }
    if (data.createdAt) {
      updatePayload.createdAt = data.createdAt;
    }

    if (remainingFiles !== undefined) {
      const currentPaths = entry.filePaths || (entry.photoPath ? [entry.photoPath] : []);
      const remainingPaths = new Set(remainingFiles.map(f => f.path));

      const deletedPaths = currentPaths.filter(p => !remainingPaths.has(p));
      for (const path of deletedPaths) {
        const deleteRes = await deleteFromStorage(path);
        if (deleteRes.error) {
          console.warn('Failed to delete storage file:', deleteRes.error);
        }
      }

      let uploadedUrls: string[] = remainingFiles.map(f => f.url);
      let uploadedPaths: string[] = remainingFiles.map(f => f.path);

      const filesToUpload = newPhotoFiles ? (Array.isArray(newPhotoFiles) ? newPhotoFiles : [newPhotoFiles]) : [];
      if (filesToUpload.length > 0) {
        const category = (data.type || entry.type) === 'problem' ? 'problems' : (data.type || entry.type) === 'solution' ? 'solutions' : 'photos';
        const uploadTasks = filesToUpload.map(file => 
          uploadToPermanent(userId, carId, category as any, historyId, file)
        );
        const uploadResults = await Promise.all(uploadTasks.map(t => t.result));
        const failedUpload = uploadResults.find(r => r.error);
        if (failedUpload && failedUpload.error) {
          throw failedUpload.error;
        }
        const successfulUploads = uploadResults.map(r => r.data!);
        uploadedUrls = [...uploadedUrls, ...successfulUploads.map(r => r.downloadUrl)];
        uploadedPaths = [...uploadedPaths, ...successfulUploads.map(r => r.storagePath)];
      }

      if (uploadedUrls.length > 0) {
        updatePayload.fileUrls = uploadedUrls;
        updatePayload.filePaths = uploadedPaths;
        updatePayload.photoUrl = uploadedUrls[0];
        updatePayload.photoPath = uploadedPaths[0];
      } else {
        updatePayload.fileUrls = deleteField();
        updatePayload.filePaths = deleteField();
        updatePayload.photoUrl = deleteField();
        updatePayload.photoPath = deleteField();
      }
    }

    await updateDoc(ref, updatePayload);
  }, [carId, userId, history]);

  const deleteEntry = useCallback(async (historyId: string) => {
    if (!carId) return;
    const entryToDelete = history.find(entry => entry.id === historyId);
    if (!entryToDelete) return;

    if (entryToDelete.filePaths && entryToDelete.filePaths.length > 0) {
      for (const path of entryToDelete.filePaths) {
        const deleteRes = await deleteFromStorage(path);
        if (deleteRes.error) {
          console.warn('Failed to delete storage file:', deleteRes.error);
        }
      }
    } else if (entryToDelete.photoPath) {
      const deleteRes = await deleteFromStorage(entryToDelete.photoPath);
      if (deleteRes.error) {
        console.warn('Failed to delete photo from storage:', deleteRes.error);
      }
    }

    if (entryToDelete.type === 'mileage') {
      const previousMileageEntry = history
        .filter(entry => entry.type === 'mileage' && entry.id !== historyId)
        .filter(entry => new Date(entry.createdAt).getTime() < new Date(entryToDelete.createdAt).getTime())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const previousMileage = previousMileageEntry?.runtimeMileage || 0;
      const now = new Date().toISOString();
      
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cars', carId, 'history', historyId));
      batch.update(doc(db, 'cars', carId), { ownerId: userId, updatedAt: now, mileage: previousMileage });
      await batch.commit();
      await updateCarMileage(previousMileage);
      return;
    }

    await deleteDoc(doc(db, 'cars', carId, 'history', historyId));
  }, [carId, userId, history, updateCarMileage]);

  return { history, loading, error, addEntry, updateEntry, deleteEntry };
}
