import { useState, useEffect } from 'react';
import { db, logEvent } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc, deleteField } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { ArrowLeft, Edit2, Check, Trash2, ShieldAlert } from 'lucide-react';
import { buildFirestoreErrorDetails, OperationType, normalizeUkrainianPhone } from '../lib/utils';
import { useErrorModal } from './ErrorModal';
import { CarForm } from './CarForm';
import { CarCard } from './CarCard';
import { ServiceHistory } from './ServiceHistory';
import { VoiceAssistant } from './VoiceAssistant';
import { LicensePlate } from './LicensePlate';
export function CarProfile({ carId, userId, onBack }: { carId: string | null, userId: string, onBack: () => void }) {
  const [car, setCar] = useState<Partial<Car>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!carId);
  const [loading, setLoading] = useState(!!carId);
  const { showError } = useErrorModal();
  const [mileageToast, setMileageToast] = useState(false);

  // Check if mileage exists in history
  const hasMileage = history.some(e => e.type === 'mileage');

  const showMileageToast = () => {
    setMileageToast(true);
    setTimeout(() => setMileageToast(false), 3000);
  };

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
        logEvent('car_updated', { car_id: carId });
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
      logEvent('car_deleted', { car_id: carId });
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}`)); }
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>) => {
    if (!carId) return;
    try {
      const now = new Date().toISOString();
      const isMileageEntry = data.type === 'mileage';

      if (isMileageEntry) {
        // Mileage entry: use user-specified value, calculate diff, update car.mileage
        const newMileage = data.runtimeMileage || 0;
        const mileageDiff = newMileage - (car.mileage || 0);
        const payload = { type: 'mileage' as const, text: data.text || `Оновлено пробіг: ${newMileage} км`, runtimeMileage: newMileage, mileageDiff, authorId: userId, createdAt: now };
        await addDoc(collection(db, 'cars', carId, 'history'), payload);
        // Update car.mileage to the new value
        const carUpdate: Record<string, any> = { ownerId: userId, updatedAt: now, mileage: newMileage };
        await updateDoc(doc(db, 'cars', carId), carUpdate);
        setCar(prev => ({ ...prev, ...carUpdate }));
      } else {
        // Non-mileage entry: auto-assign current car.mileage, no diff
        const currentMileage = car.mileage || 0;
        const payload = { type: data.type || 'note', text: data.text || '', runtimeMileage: currentMileage, mileageDiff: 0, authorId: userId, createdAt: now };
        await addDoc(collection(db, 'cars', carId, 'history'), payload);
        const carUpdate = { ownerId: userId, updatedAt: now };
        await updateDoc(doc(db, 'cars', carId), carUpdate);
        setCar(prev => ({ ...prev, ...carUpdate }));
      }
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.CREATE, `cars/${carId}/history`)); }
  };

  const handleUpdateHistory = async (historyId: string, data: Partial<HistoryEntry>) => {
    if (!carId) return;
    try {
      const ref = doc(db, 'cars', carId, 'history', historyId);
      // Only allow updating type, text, and linkedSolutionId — mileage fields are immutable
      const updatePayload: Record<string, any> = {};
      if (data.type) updatePayload.type = data.type;
      if (data.text !== undefined) updatePayload.text = data.text;
      if (data.linkedSolutionId !== undefined) {
        updatePayload.linkedSolutionId = data.linkedSolutionId === '' ? deleteField() : data.linkedSolutionId;
      }
      await updateDoc(ref, updatePayload);
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
          <LicensePlate plate={car.plate} />
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
            onMileageRequired={showMileageToast}
          />
        )}
      </div>

      {/* Bottom voice bar */}
      {!isEditing && carId && (
        <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom" style={{ background: `linear-gradient(to top, var(--t-surface-bg) 60%, transparent)` }}>
          <div className="px-4 pb-5 pt-8 flex justify-center max-w-lg mx-auto">
            <div className="flex items-center gap-3 pl-5 pr-2 py-2 rounded-full border w-full glass"
              style={{
                background: 'color-mix(in srgb, var(--t-surface-card) 90%, transparent)',
                borderColor: 'var(--t-border-default)',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)',
                opacity: hasMileage ? 1 : 0.6,
              }}>
              <span className="text-sm font-semibold flex-1" style={{ color: 'var(--t-text-secondary)' }}>
                {hasMileage ? 'Надиктувати запис' : 'Спочатку додайте пробіг'}
              </span>
              {hasMileage ? (
                <VoiceAssistant context="history" onDataExtracted={handleCreateHistory} className="!flex-row" />
              ) : (
                <button
                  onClick={showMileageToast}
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-muted)' }}
                >
                  <ShieldAlert className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mileage-required toast */}
      {mileageToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-xl"
            style={{
              background: 'var(--t-surface-card)',
              borderColor: 'color-mix(in srgb, var(--t-status-problem) 40%, var(--t-border-default))',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3)',
            }}
          >
            <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: 'var(--t-status-problem)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--t-text-primary)' }}>Спочатку додайте пробіг</span>
          </div>
        </div>
      )}
    </div>
  );
}
