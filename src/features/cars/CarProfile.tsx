import { useState, useEffect, useCallback } from 'react';
import { db, logEvent } from '@services/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, addDoc, deleteField, writeBatch } from 'firebase/firestore';
import { Car, HistoryEntry } from '@types';
import { ArrowLeft, Edit2, Check, Trash2, ShieldAlert } from '@shared/icons/Icons';
import { normalizeUkrainianPhone, removeGreenScreen } from '@/lib/utils';
import { buildFirestoreErrorDetails, OperationType } from '@shared/lib/errorUtils';
import { useErrorModal } from '@shared/lib/errorContext';
import { CarForm } from './CarForm';
import { CarInfoCard } from './components/CarInfoCard';
import { MileageToast } from './components/MileageToast';
import { ServiceHistory } from '@features/history/ServiceHistory';
import { VoiceAssistant } from '@features/ai/VoiceAssistant';
import { LicensePlate } from './LicensePlate';
import { DiagnosticFiles } from '@features/ai/DiagnosticFiles';
import { ImagePreview } from '@shared/ui/ImagePreview';
import { AvatarModal } from './components/AvatarModal';
import { Button } from '@shared/ui/Button';
import { generateCarAvatar } from '@services/ai';
import { moveFromTemp, deleteFromStorage, deleteFolder, uploadBase64ToPermanent } from '@services/storage';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@shared/context/AuthContext';
import { useApp } from '@shared/context/AppContext';
import { useDialog } from '@shared/context/DialogContext';
import { haptic } from '@shared/lib/haptic';
import { CarProfileSkeleton } from '@shared/ui/Skeleton';
import { useHistory } from '@shared/hooks';

import { useParams, useNavigate, useLocation } from 'react-router-dom';

export function CarProfile({ defaultEdit = false }: { defaultEdit?: boolean }) {
  const { user } = useAuth();
  const { id: carId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateCar, deleteCar, addCar } = useApp();
  const userId = user?.uid || '';
  const { confirm } = useDialog();
  const { colorSchemeId, mode } = useTheme();
  const [car, setCar] = useState<Partial<Car>>({});
  const isEditRoute = location.pathname.endsWith('/edit') || defaultEdit;
  const [isEditing, setIsEditing] = useState(!carId || isEditRoute);
  const [loading, setLoading] = useState(!!carId);
  const { showError } = useErrorModal();
  const [mileageToast, setMileageToast] = useState(false);

  useEffect(() => {
    setIsEditing(!carId || isEditRoute);
  }, [carId, isEditRoute]);

  const updateCarMileage = useCallback(async (newMileage: number) => {
    if (!carId) return;
    const now = new Date().toISOString();
    const carUpdate = { ownerId: userId, updatedAt: now, mileage: newMileage };
    await updateCar(carId, carUpdate);
    setCar(prev => ({ ...prev, ...carUpdate }));
  }, [carId, userId, updateCar]);

  const { history, addEntry, updateEntry, deleteEntry } = useHistory(
    carId,
    userId,
    car.mileage || 0,
    updateCarMileage
  );

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
  }, [carId]);

  const handleSaveCar = async () => {
    try {
      const now = new Date().toISOString();
      const phone = normalizeUkrainianPhone(car.clientPhone || '');
      const payload: Record<string, any> = {
        plate: (car.plate || '').toUpperCase(),
        country: car.country || 'UA',
        plateColor: car.plateColor || 'white',
        plateForm: car.plateForm || 'standard',
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
              const deleteRes = await deleteFromStorage(car.photoPath);
              if (deleteRes.error) {
                console.warn('Failed to delete old photo:', deleteRes.error);
              }
            }
            const uploadTask = uploadBase64ToPermanent(
              userId, carId, 'photos', 'car',
              pendingCar._pendingPhotoBase64,
              pendingCar._pendingPhotoFile.type || 'image/jpeg',
              pendingCar._pendingPhotoFile.name || 'car_photo.jpg'
            );
            const result = await uploadTask.result;
            if (result.error) {
              throw result.error;
            }
            payload.photoUrl = result.data.downloadUrl;
            payload.photoPath = result.data.storagePath;
          } catch (err) {
            console.error('Failed to upload car photo:', err);
          }
        }

        // Handle photo removal
        if (car.photoUrl === '' && car.photoPath === '') {
          payload.photoUrl = '';
          payload.photoPath = '';
        }

        await updateCar(carId, payload);
        setCar({ ...payload, id: carId });
        setIsEditing(false);
        haptic.success();
        logEvent('car_updated', { car_id: carId });
      } else {
        // Creating new car
        const newCarId = await addCar(payload as Omit<Car, 'id'>);

        // Move temp photo to permanent location if exists
        if (tempPhoto?.path) {
          try {
            const result = await moveFromTemp(
              tempPhoto.path, userId, newCarId, 'photos', 'car'
            );
            if (result.error) {
              throw result.error;
            }
            await updateCar(newCarId, {
              photoUrl: result.data.downloadUrl,
              photoPath: result.data.storagePath,
              avatarUrl: result.data.downloadUrl,
              avatarPath: result.data.storagePath,
            });
          } catch (err) {
            console.error('Failed to move temp photo:', err);
          }
          setTempPhoto(null);
        }

        setCar({ ...payload, id: newCarId });
        haptic.success();
        navigate('/');
      }
    } catch (err) { 
      haptic.error();
      showError(buildFirestoreErrorDetails(err, OperationType.WRITE, `cars/${carId || 'new'}`)); 
    }
  };

  const handleDeleteCar = async () => {
    if (!carId) return;
    const isConfirmed = await confirm('Видалити автомобіль та всю історію обслуговування?');
    if (!isConfirmed) return;
    try {
      // Delete all storage files for this car
      try {
        const deleteRes = await deleteFolder(`${userId}/${carId}`);
        if (deleteRes.error) {
          console.warn('Failed to delete car storage files:', deleteRes.error);
        }
      } catch (err) {
        console.warn('Failed to delete car storage files:', err);
      }

      await deleteCar(carId);
      haptic.success();
      navigate('/');
      logEvent('car_deleted', { car_id: carId });
    } catch (err) { 
      haptic.error();
      showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}`)); 
    }
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>, photoFiles?: File[] | File): Promise<string | undefined> => {
    if (!carId) return;
    try {
      const id = await addEntry(data, photoFiles);
      haptic.success();
      return id;
    } catch (err) {
      haptic.error();
      showError(buildFirestoreErrorDetails(err, OperationType.CREATE, `cars/${carId}/history`));
    }
  };

  const handleUpdateHistory = async (
    historyId: string, 
    data: Partial<HistoryEntry>, 
    newPhotoFiles?: File[] | File, 
    remainingFiles?: { url: string; path: string }[]
  ) => {
    if (!carId) return;
    try {
      await updateEntry(historyId, data, newPhotoFiles, remainingFiles);
      haptic.success();
    } catch (err) {
      haptic.error();
      showError(buildFirestoreErrorDetails(err, OperationType.UPDATE, `cars/${carId}/history/${historyId}`));
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!carId) return;
    const isConfirmed = await confirm('Видалити цей запис?');
    if (!isConfirmed) return;
    try {
      await deleteEntry(historyId);
      haptic.success();
    } catch (err) {
      haptic.error();
      showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}/history/${historyId}`));
    }
  };

  const handleGenerateAvatar = async () => {
    if (!carId || !car.make || !car.model) {
      showError({ title: 'Бракує даних', message: 'Для генерації аватара необхідно вказати хоча б марку та модель авто.', timestamp: new Date().toISOString() });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const avatarRes = await generateCarAvatar({
        make: car.make,
        model: car.model,
        color: car.color,
        bodyType: car.bodyType,
        year: car.year,
        themeId: colorSchemeId,
        themeMode: mode === 'amoled' ? 'dark' : mode
      });
      if (avatarRes.error) {
        throw avatarRes.error;
      }
      const base64 = avatarRes.data;
      
      // Keep the background, do not remove green screen
      const uploadTask = uploadBase64ToPermanent(userId, carId, 'avatar', 'gen', base64, 'image/jpeg', 'avatar.jpeg');
      const result = await uploadTask.result;
      if (result.error) {
        throw result.error;
      }
      
      const carUpdate = { avatarUrl: result.data.downloadUrl, avatarPath: result.data.storagePath, updatedAt: new Date().toISOString() };
      await updateCar(carId, carUpdate);
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
      await updateCar(carId, carUpdate);
      setCar(prev => ({ ...prev, ...carUpdate }));
      setShowAvatarModal(false);
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.UPDATE, 'avatar'));
    }
  };

  if (loading) return <CarProfileSkeleton />;

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 safe-top glass border-b" style={{ background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)', borderColor: 'var(--t-border-default)' }}>
        <div className="flex items-center justify-between px-3 py-3 gap-3">
          <Button variant="icon" size="md" id="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <LicensePlate
            plate={car.plate}
            country={car.country}
            plateColor={car.plateColor}
            plateForm={car.plateForm}
          />
          <div className="flex items-center gap-1.5">
            {carId && !isEditing && (
              <Button variant="danger" size="md" onClick={handleDeleteCar}>
                <Trash2 className="w-4.5 h-4.5" />
              </Button>
            )}
            <Button
              variant="icon"
              size="md"
              id="edit-save-btn"
              onClick={() => isEditing ? handleSaveCar() : setIsEditing(true)}
              style={{
                background: isEditing ? 'var(--t-status-solution-bg)' : 'var(--t-accent-primary-muted)',
                color: isEditing ? 'var(--t-status-solution)' : 'var(--t-text-accent)',
              }}
            >
              {isEditing ? <Check className="w-5 h-5" /> : <Edit2 className="w-4.5 h-4.5" />}
            </Button>
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
            onSwitchCar={(id) => navigate(`/car/${id}`)}
            tempPhoto={tempPhoto}
            onTempPhotoChange={setTempPhoto}
          />
        ) : (
          <CarInfoCard 
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
              carMake={car.make}
              carModel={car.model}
              carYear={car.year}
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
      <MileageToast show={mileageToast} />

      {/* Avatar Modal */}
      {showAvatarModal && carId && (
        <AvatarModal 
          userId={userId} 
          carId={carId} 
          currentAvatarUrl={car.avatarUrl} 
          carPhotoUrl={car.photoUrl}
          carPhotoPath={car.photoPath}
          onClose={() => setShowAvatarModal(false)} 
          onSetAvatar={handleSetAvatar} 
          onGenerate={handleGenerateAvatar} 
        />
      )}
    </div>
  );
}
