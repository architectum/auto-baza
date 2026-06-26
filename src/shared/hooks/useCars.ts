import { useState, useEffect, useCallback } from 'react';
import { db } from '@services/firebase';
import { collection, query, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Car } from '@types';
import { useToast } from '@shared/context/ToastContext';

export function useCars(userId: string | undefined) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setCars([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'cars'),
      where('ownerId', '==', userId)
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Car));
      data.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setCars(data);
      setLoading(false);
    }, err => {
      console.error('Failed to fetch cars:', err);
      setError(err);
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const addCar = useCallback(async (carData: Omit<Car, 'id'>) => {
    const docRef = await addDoc(collection(db, 'cars'), carData);
    if (!navigator.onLine) {
      toast.info("Автомобіль додано локально. Синхронізація відбудеться при відновленні зв'язку.");
    }
    return docRef.id;
  }, [toast]);

  const updateCar = useCallback(async (carId: string, carData: Partial<Car>) => {
    await updateDoc(doc(db, 'cars', carId), carData);
    if (!navigator.onLine) {
      toast.info("Зміни збережено локально. Синхронізація відбудеться при відновленні зв'язку.");
    }
  }, [toast]);

  const deleteCar = useCallback(async (carId: string) => {
    await deleteDoc(doc(db, 'cars', carId));
    if (!navigator.onLine) {
      toast.info("Автомобіль видалено локально. Зміни синхронізуються при відновленні зв'язку.");
    }
  }, [toast]);

  return { cars, loading, error, addCar, updateCar, deleteCar };
}
