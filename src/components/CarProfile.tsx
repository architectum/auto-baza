import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { ArrowLeft, Edit2, Check, Trash2 } from 'lucide-react';
import { buildFirestoreErrorDetails, OperationType, normalizeUkrainianPhone } from '../lib/utils';
import { useErrorModal } from './ErrorModal';
import { CarForm } from './CarForm';
import { CarCard } from './CarCard';
import { ServiceHistory } from './ServiceHistory';
import { VoiceAssistant } from './VoiceAssistant';

export function CarProfile({ carId, userId, onBack }: { carId: string | null, userId: string, onBack: () => void }) {
  const [car, setCar] = useState<Partial<Car>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!carId);
  const [loading, setLoading] = useState(!!carId);
  const { showError } = useErrorModal();

  useEffect(() => {
    if (!carId) { setLoading(false); return; }
    const fetchCar = async () => {
      try {
        const snap = await getDoc(doc(db, 'cars', carId));
        if (snap.exists()) { setCar({ id: snap.id, ...snap.data() } as Car); }
        else { setIsEditing(true); }
      } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.GET, `cars/${carId}`)); }
      finally { setLoading(false); }
    };
    fetchCar();
    const q = query(collection(db, 'cars', carId, 'history'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryEntry)));
    }, err => { showError(buildFirestoreErrorDetails(err, OperationType.LIST, `cars/${carId}/history`)); });
    return unsub;
  }, [carId]);

  const handleSaveCar = async () => {
    try {
      const now = new Date().toISOString();
      const phone = normalizeUkrainianPhone(car.clientPhone || '');
      const payload = {
        plate: (car.plate || '').toUpperCase(),
        ownerId: userId,
        createdAt: car.createdAt || now,
        updatedAt: now,
        make: car.make || '',
        model: car.model || '',
        year: Number(car.year) || 0,
        mileage: car.mileage || 0,
        color: car.color || '',
        bodyType: car.bodyType || '',
        clientName: car.clientName || '',
        clientPhone: phone,
        note: car.note || '',
      };
      if (carId) {
        await updateDoc(doc(db, 'cars', carId), payload);
        setCar({ ...payload, id: carId });
        setIsEditing(false);
      } else {
        const newDoc = await addDoc(collection(db, 'cars'), payload);
        setCar({ ...payload, id: newDoc.id });
        onBack();
      }
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.WRITE, `cars/${carId || 'new'}`)); }
  };

  const handleDeleteCar = async () => {
    if (!carId) return;
    if (!window.confirm('Видалити автомобіль та всю історію обслуговування?')) return;
    try {
      await deleteDoc(doc(db, 'cars', carId));
      onBack();
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}`)); }
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>) => {
    if (!carId) return;
    try {
      const newMileage = data.runtimeMileage || car.mileage || 0;
      let mileageDiff = 0;
      if (car.mileage && newMileage) mileageDiff = newMileage - car.mileage;
      const payload = { type: data.type || 'note', text: data.text || '', runtimeMileage: newMileage, mileageDiff, authorId: userId, createdAt: new Date().toISOString() };
      await addDoc(collection(db, 'cars', carId, 'history'), payload);
      const carUpdate: Record<string, any> = { ownerId: userId, updatedAt: new Date().toISOString() };
      if (newMileage > (car.mileage || 0)) carUpdate.mileage = newMileage;
      await updateDoc(doc(db, 'cars', carId), carUpdate);
      setCar(prev => ({ ...prev, ...carUpdate }));
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.CREATE, `cars/${carId}/history`)); }
  };

  const handleUpdateHistory = async (historyId: string, data: Partial<HistoryEntry>) => {
    if (!carId) return;
    try {
      const ref = doc(db, 'cars', carId, 'history', historyId);
      const existing = (await getDoc(ref)).data() as HistoryEntry;
      const updated = { ...existing, ...data };
      if (data.runtimeMileage) {
        updated.mileageDiff = data.runtimeMileage - (car.mileage || 0);
      }
      await updateDoc(ref, updated);
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.UPDATE, `cars/${carId}/history/${historyId}`)); }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!carId) return;
    if (!window.confirm('Видалити цей запис?')) return;
    try {
      await deleteDoc(doc(db, 'cars', carId, 'history', historyId));
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}/history/${historyId}`)); }
  };

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--t-surface-bg)' }}>
      <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--t-border-default)', borderTopColor: 'var(--t-accent-primary)' }} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 safe-top glass border-b" style={{ background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)', borderColor: 'var(--t-border-default)' }}>
        <div className="flex items-center justify-between px-3 py-3 gap-3">
          <button id="back-btn" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-mono font-bold px-3 py-1.5 rounded-lg text-sm tracking-widest uppercase text-center truncate"
            style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-primary)', border: '1px solid var(--t-border-default)' }}>
            {car.plate || 'НОВЕ АВТО'}
          </div>
          <div className="flex items-center gap-1.5">
            {carId && !isEditing && (
              <button onClick={handleDeleteCar} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
                style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
            <button id="edit-save-btn" onClick={() => isEditing ? handleSaveCar() : setIsEditing(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
              style={{ background: isEditing ? 'var(--t-status-solution-bg)' : 'var(--t-accent-primary-muted)', color: isEditing ? 'var(--t-status-solution)' : 'var(--t-text-accent)' }}>
              {isEditing ? <Check className="w-5 h-5" /> : <Edit2 className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {isEditing ? (
          <CarForm car={car} setCar={setCar} isNew={!carId} onSave={handleSaveCar} />
        ) : (
          <CarCard car={car} />
        )}
        {!isEditing && carId && (
          <ServiceHistory
            history={history}
            currentMileage={car.mileage || 0}
            onCreateHistory={handleCreateHistory}
            onUpdateHistory={handleUpdateHistory}
            onDeleteHistory={handleDeleteHistory}
          />
        )}
      </div>

      {/* Bottom voice bar */}
      {!isEditing && carId && (
        <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom" style={{ background: `linear-gradient(to top, var(--t-surface-bg) 60%, transparent)` }}>
          <div className="px-4 pb-5 pt-8 flex justify-center max-w-lg mx-auto">
            <div className="flex items-center gap-3 pl-5 pr-2 py-2 rounded-full border w-full glass"
              style={{ background: 'color-mix(in srgb, var(--t-surface-card) 90%, transparent)', borderColor: 'var(--t-border-default)', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)' }}>
              <span className="text-sm font-semibold flex-1" style={{ color: 'var(--t-text-secondary)' }}>Надиктувати запис</span>
              <VoiceAssistant context="history" onDataExtracted={handleCreateHistory} className="!flex-row" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
