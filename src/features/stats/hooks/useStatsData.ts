import { useState, useEffect, useMemo } from 'react';
import { db } from '@services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { HistoryEntry, Car } from '@types';
import { useApp } from '@shared/context/AppContext';

export function useStatsData() {
  const { cars } = useApp();
  const [allHistory, setAllHistory] = useState<(HistoryEntry & { carId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cars.length === 0) {
      setAllHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const historySubs: (() => void)[] = [];
    const historyMap = new Map<string, (HistoryEntry & { carId: string })[]>();

    cars.forEach(car => {
      if (!car.id) return;
      const histQ = query(collection(db, 'cars', car.id, 'history'));
      const unsub = onSnapshot(histQ, snap => {
        const entries = snap.docs.map(d => ({
          ...(d.data() as HistoryEntry),
          id: d.id,
          carId: car.id!,
        }));
        historyMap.set(car.id!, entries);

        // Merge all entries
        const merged: (HistoryEntry & { carId: string })[] = [];
        historyMap.forEach(arr => merged.push(...arr));
        setAllHistory(merged);
        setLoading(false);
      }, err => {
        console.error('Failed to load history for car:', car.id, err);
      });
      historySubs.push(unsub);
    });

    return () => {
      historySubs.forEach(unsub => unsub());
    };
  }, [cars]);

  const carsById = useMemo(
    () => new Map<string, Car>(
      cars.filter(c => !!c.id).map(c => [c.id!, c])
    ),
    [cars]
  );

  return { allHistory, loading, carsById };
}
