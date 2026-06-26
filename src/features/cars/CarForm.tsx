import React, { useState } from 'react';
import { Car } from '@types';
import { MergeConflictModal, smartMerge } from './components/MergeConflictModal';
import { ImagePreview } from '@shared/ui/ImagePreview';
import { Car as CarIcon, User, AlertTriangle, ArrowRight, X } from '@shared/icons/Icons';
import { db } from '@services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { uploadBase64ToTemp, deleteFromStorage } from '@services/storage';
import { VoiceAssistant } from '@features/ai/VoiceAssistant'; // Re-needed for client info voice assistant

import { COLORS, BODY_TYPES } from './constants';
import { AIFillSection } from './components/AIFillSection';
import { ColorPicker } from './components/ColorPicker';
import { BodyTypePicker } from './components/BodyTypePicker';
import { Card, Input, Select, Textarea, Button, ProgressBar } from '@shared/ui';

const CAR_FIELDS = ['plate', 'make', 'model', 'year', 'color', 'bodyType', 'note'];
const CAR_VOICE_FIELDS = ['make', 'model'];
const CLIENT_FIELDS = ['clientName', 'clientPhone'];

interface Props {
  car: Partial<Car>;
  setCar: (c: Partial<Car>) => void;
  isNew: boolean;
  onSave: () => void;
  userId?: string;
  onSwitchCar?: (id: string) => void;
  /** Temp photo info managed externally */
  tempPhoto?: { url: string; path: string } | null;
  onTempPhotoChange?: (photo: { url: string; path: string } | null) => void;
}

export function CarForm({ car, setCar, isNew, onSave, userId, onSwitchCar, tempPhoto, onTempPhotoChange }: Props) {
  const [hasYear, setHasYear] = useState(!!car.year);
  const [pendingConflicts, setPendingConflicts] = useState<any[] | null>(null);
  const [pendingAutoFilled, setPendingAutoFilled] = useState<Record<string, any>>({});
  const [existingCarAlert, setExistingCarAlert] = useState<{ id: string; plate: string; make: string; model: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Smart merge handler for any AI data
  const handleAIData = async (data: Record<string, any>, fields: string[], photoFile?: File, base64?: string) => {
    // Uppercase plate if present
    if (data.plate) data.plate = data.plate.toUpperCase();

    if (isNew && data.plate && userId) {
      try {
        const q = query(
          collection(db, 'cars'), 
          where('ownerId', '==', userId), 
          where('plate', '==', data.plate)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const existingDoc = snap.docs[0];
          const existingData = existingDoc.data();
          setExistingCarAlert({
            id: existingDoc.id,
            plate: existingData.plate,
            make: existingData.make || '',
            model: existingData.model || ''
          });
          return; // Do not apply the extracted data, let user decide
        }
      } catch (err) {
        console.error("Error checking existing car", err);
      }
    }

    // Upload photo to temp if new car and we have a file
    if (base64 && userId && onTempPhotoChange) {
      try {
        // Delete previous temp if exists
        if (tempPhoto?.path) {
          const deleteRes = await deleteFromStorage(tempPhoto.path);
          if (deleteRes.error) {
            console.warn('Failed to delete previous temp photo:', deleteRes.error);
          }
        }
        setUploadProgress(0);
        const { progress, result } = uploadBase64ToTemp(userId, base64, photoFile?.type || 'image/jpeg', photoFile?.name || 'car_photo.jpg');
        const unsub = progress.subscribe(p => setUploadProgress(p));
        const res = await result;
        unsub();
        setUploadProgress(null);
        if (res.error) {
          throw res.error;
        }
        onTempPhotoChange({ url: res.data.downloadUrl, path: res.data.storagePath });
      } catch (err) {
        setUploadProgress(null);
        console.error('Failed to upload temp photo:', err);
      }
    } else if (base64 && !isNew) {
      // For existing car, set photo URL directly (will be handled by CarProfile)
      // We pass the base64 info back via the car state
      if (photoFile) {
        setCar({ ...car, _pendingPhotoFile: photoFile, _pendingPhotoBase64: base64 } as any);
      }
    }

    const { autoFilled, conflicts } = smartMerge(car, data, fields);

    // Apply auto-filled immediately
    const updated = { ...car, ...autoFilled };
    if (autoFilled.year) setHasYear(true);

    if (conflicts.length > 0) {
      setPendingAutoFilled(autoFilled);
      setPendingConflicts(conflicts);
      setCar(updated);
    } else {
      setCar(updated);
    }
  };

  const handleConflictResolve = (resolutions: Record<string, string>) => {
    const updated = { ...car, ...pendingAutoFilled };
    for (const [field, value] of Object.entries(resolutions)) {
      (updated as any)[field] = field === 'year' ? parseInt(value) || 0 : value;
      if (field === 'year' && value) setHasYear(true);
    }
    setCar(updated);
    setPendingConflicts(null);
    setPendingAutoFilled({});
  };

  const handleRemovePhoto = async () => {
    if (tempPhoto) {
      if (tempPhoto.path) {
        const deleteRes = await deleteFromStorage(tempPhoto.path);
        if (deleteRes.error) {
          console.warn('Failed to delete temp photo:', deleteRes.error);
        }
      }
      onTempPhotoChange?.(null);
    } else if (car.photoUrl) {
      setCar({ ...car, photoUrl: '', photoPath: '' });
    }
  };

  const currentPhotoUrl = tempPhoto?.url || car.photoUrl;

  // Calculate form completion progress
  const progressFields = [
    car.plate,
    car.make,
    car.model,
    car.year,
    car.color,
    car.bodyType,
    car.note,
    car.clientName,
    car.clientPhone
  ];
  const filledCount = progressFields.filter(val => val !== undefined && val !== null && val !== '' && val !== 0).length;
  const progressPercent = Math.round((filledCount / progressFields.length) * 100);

  // Generate options for year select
  const yearOptions = Array.from({ length: 50 }, (_, i) => {
    const y = String(new Date().getFullYear() - i);
    return { value: y, label: y };
  });

  return (
    <>
      <Card className="relative overflow-hidden" padding="lg" style={{ boxShadow: '0 16px 36px -28px rgba(0,0,0,0.45)' }}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))' }} />
        
        {/* Form Progress Bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold" style={{ color: 'var(--t-text-secondary)' }}>
            <span>Заповнено полів: {filledCount} з {progressFields.length}</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <ProgressBar progress={progressPercent} showLabel={false} />
        </div>

        {/* AI auto-fill blocks */}
        <AIFillSection
          userId={userId}
          isNew={isNew}
          uploadProgress={uploadProgress}
          handleAIData={handleAIData}
          carFields={CAR_FIELDS}
          carVoiceFields={CAR_VOICE_FIELDS}
        />

        {/* Car Photo Preview */}
        {currentPhotoUrl && (
          <div className="mb-5 relative">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Фото автомобіля</label>
            <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: 'var(--t-border-default)' }}>
              <img
                src={currentPhotoUrl}
                alt="Фото авто"
                className="w-full h-40 object-cover cursor-pointer"
                onClick={() => setPreviewUrl(currentPhotoUrl)}
              />
              <button
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center active:scale-90"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* === CAR DATA SECTION === */}
        <div className="space-y-4">
          <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}><CarIcon className="w-3.5 h-3.5" /></span>
            Дані автомобіля
          </h3>

          <Input
            label="Номерний знак"
            type="text"
            value={car.plate || ''}
            onChange={e => setCar({ ...car, plate: e.target.value.toUpperCase() })}
            placeholder="AA1234BB"
            className="font-mono uppercase tracking-wider"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Марка"
              type="text"
              value={car.make || ''}
              onChange={e => setCar({ ...car, make: e.target.value })}
              placeholder="Skoda"
            />
            <Input
              label="Модель"
              type="text"
              value={car.model || ''}
              onChange={e => setCar({ ...car, model: e.target.value })}
              placeholder="Octavia"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 justify-end">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Рік випуску</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  <input type="checkbox" checked={hasYear} onChange={e => { setHasYear(e.target.checked); if (!e.target.checked) setCar({ ...car, year: 0 }); }} className="rounded" />
                  Вказати
                </label>
              </div>
              <Select
                value={car.year || ''}
                onChange={e => setCar({ ...car, year: parseInt(e.target.value) })}
                disabled={!hasYear}
                placeholder="Оберіть рік"
                options={yearOptions}
              />
            </div>
            <BodyTypePicker value={car.bodyType || ''} onChange={val => setCar({ ...car, bodyType: val })} />
          </div>

          <ColorPicker value={car.color || ''} onChange={val => setCar({ ...car, color: val })} />
          
          <Textarea
            label="Нотатки"
            value={car.note || ''}
            onChange={e => setCar({ ...car, note: e.target.value })}
            placeholder="Загальні проблеми або побажання..."
            minRows={3}
          />
        </div>

        {/* === CLIENT DATA SECTION === */}
        <div className="pt-5 mt-5 border-t" style={{ borderColor: 'var(--t-border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
              <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}><User className="w-3.5 h-3.5" /></span>
              Інформація про клієнта
            </h3>
            <VoiceAssistant context="client" onDataExtracted={d => handleAIData(d, CLIENT_FIELDS)} size="sm" className="!flex-row" />
          </div>
          <div className="space-y-3">
            <Input
              label="Ім'я"
              type="text"
              value={car.clientName || ''}
              onChange={e => setCar({ ...car, clientName: e.target.value })}
              placeholder="Іван Іванов"
            />
            <Input
              label="Телефон"
              type="tel"
              value={car.clientPhone || ''}
              onChange={e => setCar({ ...car, clientPhone: e.target.value })}
              placeholder="+380XXXXXXXXX"
              className="font-mono"
            />
          </div>
        </div>

        <Button 
          id="save-vehicle-btn" 
          onClick={onSave}
          fullWidth
          className="mt-5 !py-3.5 text-base shadow-md t-accent-gradient"
          style={{ color: 'var(--t-text-on-accent)' }}
        >
          Зберегти дані авто
        </Button>
      </Card>

      {pendingConflicts && pendingConflicts.length > 0 && (
        <MergeConflictModal
          conflicts={pendingConflicts}
          onResolve={handleConflictResolve}
          onClose={() => setPendingConflicts(null)}
        />
      )}

      {existingCarAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-scale-in" style={{ background: 'var(--t-surface-card)', border: '1px solid var(--t-border-default)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--t-text-primary)' }}>Таке авто вже є</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--t-text-secondary)' }}>У вашому списку знайдено автомобіль з таким номером.</p>
              </div>
            </div>
            
            <div className="p-3 rounded-xl mb-5 flex items-center gap-3" style={{ background: 'var(--t-surface-elevated)' }}>
              <div className="flex-1 font-mono font-bold text-lg" style={{ color: 'var(--t-text-primary)' }}>{existingCarAlert.plate}</div>
              <div className="text-sm font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                {existingCarAlert.make} {existingCarAlert.model}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  if (onSwitchCar) onSwitchCar(existingCarAlert.id);
                  setExistingCarAlert(null);
                }}
                fullWidth
                className="!py-3.5 font-semibold flex items-center justify-center gap-2"
              >
                Перейти до автомобіля <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => setExistingCarAlert(null)}
                variant="secondary"
                fullWidth
                className="!py-3.5 font-semibold"
              >
                Закрити
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  );
}

export { COLORS };
