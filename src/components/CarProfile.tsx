import { useState, useEffect } from 'react';
import { db, logEvent } from '../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc, deleteField, writeBatch } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { ArrowLeft, Edit2, Check, Trash2, ShieldAlert } from './Icons';
import { buildFirestoreErrorDetails, OperationType, normalizeUkrainianPhone, removeGreenScreen } from '../lib/utils';
import { useErrorModal } from './ErrorModal';
import { CarForm } from './CarForm';
import { CarCard } from './CarCard';
import { ServiceHistory } from './ServiceHistory';
import { VoiceAssistant } from './VoiceAssistant';
import { LicensePlate } from './LicensePlate';
import { DiagnosticFiles } from './DiagnosticFiles';
import { ImagePreview } from './ImagePreview';
import { AvatarModal } from './AvatarModal';
import { generateCarAvatar } from '../services/ai';
import { moveFromTemp, uploadToPermanent, deleteFromStorage, deleteFolder, uploadBase64ToPermanent } from '../services/storage';

export function CarProfile({ carId, userId, onBack, onSwitchCar }: { carId: string | null, userId: string, onBack: () => void, onSwitchCar?: (id: string) => void }) {
  const [car, setCar] = useState<Partial<Car>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!carId);
  const [loading, setLoading] = useState(!!carId);
  const { showError } = useErrorModal();
  const [mileageToast, setMileageToast] = useState(false);

  // Temp photo state for new car creation
  const [tempPhoto, setTempPhoto] = useState<{ url: string; path: string } | null>(null);
  // Photo preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Avatar state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Check if mileage exists in history
  const hasMileage = history.some(e => e.type === 'mileage');

  const showMileageToast = () => {
    setMileageToast(true);
    setTimeout(() => setMileageToast(false), 3000);
  };

  useEffect(() => {
    if (!carId) { 
      setIsEditing(true);
      setLoading(false); 
      setTempPhoto(null);
      return; 
    }
    
    setLoading(true);
    setIsEditing(false);
    setTempPhoto(null);

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
      const payload: Record<string, any> = {
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

      // Preserve existing photo fields
      if (car.photoUrl) payload.photoUrl = car.photoUrl;
      if (car.photoPath) payload.photoPath = car.photoPath;

      if (carId) {
        // Editing existing car
        // Handle pending photo from PhotoAssistant (for existing car)
        const pendingCar = car as any;
        if (pendingCar._pendingPhotoBase64 && pendingCar._pendingPhotoFile) {
          try {
            // Delete old photo if exists
            if (car.photoPath) {
              await deleteFromStorage(car.photoPath);
            }
            const result = await uploadBase64ToPermanent(
              userId, carId, 'photos', 'car',
              pendingCar._pendingPhotoBase64,
              pendingCar._pendingPhotoFile.type || 'image/jpeg',
              pendingCar._pendingPhotoFile.name || 'car_photo.jpg'
            );
            payload.photoUrl = result.downloadUrl;
            payload.photoPath = result.storagePath;
          } catch (err) {
            console.error('Failed to upload car photo:', err);
          }
        }

        // Handle photo removal
        if (car.photoUrl === '' && car.photoPath === '') {
          payload.photoUrl = '';
          payload.photoPath = '';
        }

        await updateDoc(doc(db, 'cars', carId), payload);
        setCar({ ...payload, id: carId });
        setIsEditing(false);
        logEvent('car_updated', { car_id: carId });
      } else {
        // Creating new car
        const newDoc = await addDoc(collection(db, 'cars'), payload);
        const newCarId = newDoc.id;

        // Move temp photo to permanent location if exists
        if (tempPhoto?.path) {
          try {
            const result = await moveFromTemp(
              tempPhoto.path, userId, newCarId, 'photos', 'car'
            );
            await updateDoc(doc(db, 'cars', newCarId), {
              photoUrl: result.downloadUrl,
              photoPath: result.storagePath,
            });
          } catch (err) {
            console.error('Failed to move temp photo:', err);
          }
          setTempPhoto(null);
        }

        setCar({ ...payload, id: newCarId });
        onBack();
      }
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.WRITE, `cars/${carId || 'new'}`)); }
  };

  const handleDeleteCar = async () => {
    if (!carId) return;
    if (!window.confirm('Видалити автомобіль та всю історію обслуговування?')) return;
    try {
      // Delete all storage files for this car
      try {
        await deleteFolder(`${userId}/${carId}`);
      } catch (err) {
        console.warn('Failed to delete car storage files:', err);
      }

      await deleteDoc(doc(db, 'cars', carId));
      onBack();
      logEvent('car_deleted', { car_id: carId });
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}`)); }
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>, photoFile?: File) => {
    if (!carId) return;
    try {
      const now = new Date().toISOString();
      const isMileageEntry = data.type === 'mileage';

      if (isMileageEntry) {
        // Mileage entry: use user-specified value, calculate diff, update car.mileage
        const newMileage = data.runtimeMileage || 0;
        const mileageDiff = newMileage - (car.mileage || 0);
        const histPayload: Record<string, any> = { type: 'mileage' as const, text: data.text || `Оновлено пробіг: ${newMileage} км`, runtimeMileage: newMileage, mileageDiff, authorId: userId, createdAt: now };
        await addDoc(collection(db, 'cars', carId, 'history'), histPayload);
        // Update car.mileage to the new value
        const carUpdate: Record<string, any> = { ownerId: userId, updatedAt: now, mileage: newMileage };
        await updateDoc(doc(db, 'cars', carId), carUpdate);
        setCar(prev => ({ ...prev, ...carUpdate }));
      } else {
        // Non-mileage entry: auto-assign current car.mileage, no diff
        const currentMileage = car.mileage || 0;
        const histPayload: Record<string, any> = { type: data.type || 'note', text: data.text || '', runtimeMileage: currentMileage, mileageDiff: 0, authorId: userId, createdAt: now };
        if (data.cost !== undefined) histPayload.cost = data.cost;

        // Create the history doc first to get the ID
        const histDoc = await addDoc(collection(db, 'cars', carId, 'history'), histPayload);

        // Upload photo if provided
        if (photoFile) {
          try {
            const category = data.type === 'problem' ? 'problems' : data.type === 'solution' ? 'solutions' : 'photos';
            const result = await uploadToPermanent(userId, carId, category as any, histDoc.id, photoFile);
            await updateDoc(doc(db, 'cars', carId, 'history', histDoc.id), {
              photoUrl: result.downloadUrl,
              photoPath: result.storagePath,
            });
          } catch (err) {
            console.error('Failed to upload history photo:', err);
          }
        }

        const carUpdate = { ownerId: userId, updatedAt: now };
        await updateDoc(doc(db, 'cars', carId), carUpdate);
        setCar(prev => ({ ...prev, ...carUpdate }));
      }
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.CREATE, `cars/${carId}/history`)); }
  };

  const handleUpdateHistory = async (historyId: string, data: Partial<HistoryEntry>, photoFile?: File) => {
    if (!carId) return;
    try {
      const ref = doc(db, 'cars', carId, 'history', historyId);
      // Only allow updating type, text, linkedSolutionId, photo, cost — mileage fields are immutable
      const updatePayload: Record<string, any> = {};
      if (data.type) updatePayload.type = data.type;
      if (data.text !== undefined) updatePayload.text = data.text;
      if (data.linkedSolutionId !== undefined) {
        updatePayload.linkedSolutionId = data.linkedSolutionId === '' ? deleteField() : data.linkedSolutionId;
      }
      if ('cost' in data) {
        updatePayload.cost = data.cost === undefined ? deleteField() : data.cost;
      }

      // Handle photo removal
      if (data.photoUrl === '' && data.photoPath === '') {
        // Delete old photo from storage
        const entry = history.find(e => e.id === historyId);
        if (entry?.photoPath) {
          await deleteFromStorage(entry.photoPath);
        }
        updatePayload.photoUrl = deleteField();
        updatePayload.photoPath = deleteField();
      }

      // Upload new photo if provided
      if (photoFile) {
        const entry = history.find(e => e.id === historyId);
        // Delete old photo
        if (entry?.photoPath) {
          await deleteFromStorage(entry.photoPath);
        }
        const category = (data.type || entry?.type) === 'problem' ? 'problems' : (data.type || entry?.type) === 'solution' ? 'solutions' : 'photos';
        const result = await uploadToPermanent(userId, carId, category as any, historyId, photoFile);
        updatePayload.photoUrl = result.downloadUrl;
        updatePayload.photoPath = result.storagePath;
      }

      await updateDoc(ref, updatePayload);
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.UPDATE, `cars/${carId}/history/${historyId}`)); }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!carId) return;
    if (!window.confirm('Видалити цей запис?')) return;
    try {
      const entryToDelete = history.find(entry => entry.id === historyId);

      // Delete associated photo from storage
      if (entryToDelete?.photoPath) {
        await deleteFromStorage(entryToDelete.photoPath);
      }

      if (entryToDelete?.type === 'mileage') {
        const previousMileageEntry = history
          .filter(entry => entry.type === 'mileage' && entry.id !== historyId)
          .filter(entry => new Date(entry.createdAt).getTime() < new Date(entryToDelete.createdAt).getTime())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const previousMileage = previousMileageEntry?.runtimeMileage || 0;
        const now = new Date().toISOString();
        const carUpdate = { ownerId: userId, updatedAt: now, mileage: previousMileage };
        const batch = writeBatch(db);
        batch.delete(doc(db, 'cars', carId, 'history', historyId));
        batch.update(doc(db, 'cars', carId), carUpdate);
        await batch.commit();
        setCar(prev => ({ ...prev, ...carUpdate }));
        return;
      }

      await deleteDoc(doc(db, 'cars', carId, 'history', historyId));
    } catch (err) { showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}/history/${historyId}`)); }
  };

  const handleGenerateAvatar = async () => {
    if (!carId || !car.make || !car.model) {
      showError({ title: 'Бракує даних', message: 'Для генерації аватара необхідно вказати хоча б марку та модель авто.', timestamp: new Date().toISOString() });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const base64 = await generateCarAvatar({
        make: car.make,
        model: car.model,
        color: car.color,
        bodyType: car.bodyType,
        year: car.year
      });
      
      // Keep the background, do not remove green screen
      const result = await uploadBase64ToPermanent(userId, carId, 'avatar', 'gen', base64, 'image/jpeg', 'avatar.jpeg');
      
      const carUpdate = { avatarUrl: result.downloadUrl, avatarPath: result.storagePath, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'cars', carId), carUpdate);
      setCar(prev => ({ ...prev, ...carUpdate }));
      setShowAvatarModal(false);
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.CREATE, 'avatar'));
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSetAvatar = async (url: string, path: string) => {
    if (!carId) return;
    try {
      const carUpdate = { avatarUrl: url, avatarPath: path, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'cars', carId), carUpdate);
      setCar(prev => ({ ...prev, ...carUpdate }));
      setShowAvatarModal(false);
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.UPDATE, 'avatar'));
    }
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
          <CarForm
            car={car}
            setCar={setCar}
            isNew={!carId}
            onSave={handleSaveCar}
            userId={userId}
            onSwitchCar={onSwitchCar}
            tempPhoto={tempPhoto}
            onTempPhotoChange={setTempPhoto}
          />
        ) : (
          <CarCard 
            car={car} 
            onPhotoClick={() => car.photoUrl && setPreviewPhotoUrl(car.photoUrl)} 
            onAvatarClick={() => setShowAvatarModal(true)}
            onGenerateAvatar={handleGenerateAvatar}
            isGeneratingAvatar={isGeneratingAvatar}
          />
        )}
        {!isEditing && carId && (
          <>
            <DiagnosticFiles 
              carId={carId} 
              userId={userId} 
              onCreateHistory={handleCreateHistory} 
            />
            <ServiceHistory
              history={history}
              currentMileage={car.mileage || 0}
              onCreateHistory={handleCreateHistory}
              onUpdateHistory={handleUpdateHistory}
              onDeleteHistory={handleDeleteHistory}
              onMileageRequired={showMileageToast}
            />
          </>
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

      {/* Car photo preview */}
      {previewPhotoUrl && (
        <ImagePreview url={previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} />
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

      {/* Avatar Modal */}
      {showAvatarModal && carId && (
        <AvatarModal 
          userId={userId} 
          carId={carId} 
          currentAvatarUrl={car.avatarUrl} 
          onClose={() => setShowAvatarModal(false)} 
          onSetAvatar={handleSetAvatar} 
          onGenerate={handleGenerateAvatar} 
        />
      )}
    </div>
  );
}
