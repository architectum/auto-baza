import React, { useState } from 'react';
import { Car } from '../types';
import { VoiceAssistant } from './VoiceAssistant';
import { PhotoAssistant } from './PhotoAssistant';
import { MergeConflictModal, smartMerge } from './MergeConflictModal';
import { ImagePreview } from './ImagePreview';
import { Camera, Mic, Car as CarIcon, User, AlertTriangle, ArrowRight, X } from './Icons';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { uploadBase64ToTemp, deleteFromStorage } from '../services/storage';

const COLORS = [
  { label: 'Білий', value: 'білий', hex: '#FFFFFF' },
  { label: 'Чорний', value: 'чорний', hex: '#000000' },
  { label: 'Сірий', value: 'сірий', hex: '#808080' },
  { label: 'Сріблястий', value: 'сріблястий', hex: '#C0C0C0' },
  { label: 'Червоний', value: 'червоний', hex: '#FF0000' },
  { label: 'Синій', value: 'синій', hex: '#0000FF' },
  { label: 'Блакитний', value: 'блакитний', hex: '#ADD8E6' },
  { label: 'Зелений', value: 'зелений', hex: '#008000' },
  { label: 'Жовтий', value: 'жовтий', hex: '#FFFF00' },
  { label: 'Коричневий', value: 'коричневий', hex: '#A52A2A' },
  { label: 'Помаранчевий', value: 'помаранчевий', hex: '#FFA500' },
  { label: 'Фіолетовий', value: 'фіолетовий', hex: '#800080' },
  { label: 'Бежевий', value: 'бежевий', hex: '#F5F5DC' },
];

const BODY_TYPES = [
  'Седан','Хетчбек','Універсал','Позашляховик / Кросовер',
  'Купе','Мінівен','Пікап','Кабріолет','Фургон'
].map(t => ({ label: t, value: t.toLowerCase() }));

const CAR_FIELDS = ['plate', 'make', 'model', 'year', 'color', 'bodyType', 'note'];
const CAR_VOICE_FIELDS = ['make', 'model'];
const CLIENT_FIELDS = ['clientName', 'clientPhone'];

function TInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>{label}</label>
      <input {...props} className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus" style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)', ...(props.style || {}) }} />
    </div>
  );
}

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
          await deleteFromStorage(tempPhoto.path);
        }
        const result = await uploadBase64ToTemp(userId, base64, photoFile?.type || 'image/jpeg', photoFile?.name || 'car_photo.jpg');
        onTempPhotoChange({ url: result.downloadUrl, path: result.storagePath });
      } catch (err) {
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
        await deleteFromStorage(tempPhoto.path);
      }
      onTempPhotoChange?.(null);
    } else if (car.photoUrl) {
      setCar({ ...car, photoUrl: '', photoPath: '' });
    }
  };

  const currentPhotoUrl = tempPhoto?.url || car.photoUrl;

  return (
    <>
      <div className="rounded-2xl p-5 border relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)', boxShadow: '0 16px 36px -28px rgba(0,0,0,0.45)' }}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))' }} />
        {/* AI auto-fill blocks */}
        <div className="grid grid-cols-1 gap-3 mb-5">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl" style={{ background: 'var(--t-surface-elevated)', border: '1px solid var(--t-border-default)' }}>
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <Camera className="w-4 h-4" style={{ color: 'var(--t-text-accent)' }} /> З фото
            </span>
            <PhotoAssistant onDataExtracted={(d, file, b64) => handleAIData(d, CAR_FIELDS, file, b64)} />
          </div>
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl" style={{ background: 'var(--t-accent-primary-muted)', border: '1px solid var(--t-border-accent)' }}>
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-accent)' }}>
              <Mic className="w-4 h-4" /> З голосу
            </span>
            <VoiceAssistant context="car" onDataExtracted={d => handleAIData(d, CAR_VOICE_FIELDS)} />
          </div>
        </div>

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

        {/* === CAR DATA === */}
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}><CarIcon className="w-3.5 h-3.5" /></span>
          Дані автомобіля
        </h3>
        <div className="space-y-4">
          <TInput label="Номерний знак" type="text" value={car.plate || ''} onChange={e => setCar({ ...car, plate: e.target.value.toUpperCase() })} placeholder="AA1234BB" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Марка" type="text" value={car.make || ''} onChange={e => setCar({ ...car, make: e.target.value })} />
            <TInput label="Модель" type="text" value={car.model || ''} onChange={e => setCar({ ...car, model: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 justify-end">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Рік випуску</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  <input type="checkbox" checked={hasYear} onChange={e => { setHasYear(e.target.checked); if (!e.target.checked) setCar({ ...car, year: 0 }); }} className="rounded" />
                  Вказати
                </label>
              </div>
              <select value={car.year || ''} onChange={e => setCar({ ...car, year: parseInt(e.target.value) })} disabled={!hasYear}
                className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus disabled:opacity-50"
                style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
                <option value="" disabled>Оберіть рік</option>
                {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 justify-end">
              <label className="text-xs font-semibold uppercase tracking-wider px-0.5" style={{ color: 'var(--t-text-muted)' }}>Тип кузова</label>
              <select value={car.bodyType?.toLowerCase() || ''} onChange={e => setCar({ ...car, bodyType: e.target.value })}
                className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
                style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
                <option value="">Не обрано</option>
                {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Колір</label>
            <div className="flex items-center gap-2">
              {car.color && COLORS.find(c => c.value === car.color?.toLowerCase()) && (
                <div className="w-11 h-11 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: COLORS.find(c => c.value === car.color?.toLowerCase())?.hex, borderColor: 'var(--t-border-default)' }} />
              )}
              <select value={car.color?.toLowerCase() || ''} onChange={e => setCar({ ...car, color: e.target.value })}
                className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
                style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
                <option value="">Не обрано</option>
                {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Нотатки</label>
            <textarea value={car.note || ''} onChange={e => setCar({ ...car, note: e.target.value })} placeholder="Загальні проблеми або побажання..."
              className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus resize-none"
              style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)', minHeight: '5rem' }} />
          </div>
        </div>

        {/* === CLIENT DATA === */}
        <div className="pt-5 mt-5 border-t" style={{ borderColor: 'var(--t-border-default)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
              <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}><User className="w-3.5 h-3.5" /></span>
              Інформація про клієнта
            </h3>
            <VoiceAssistant context="client" onDataExtracted={d => handleAIData(d, CLIENT_FIELDS)} size="sm" className="!flex-row" />
          </div>
          <div className="space-y-3">
            <TInput label="Ім'я" type="text" value={car.clientName || ''} onChange={e => setCar({ ...car, clientName: e.target.value })} />
            <TInput label="Телефон" type="tel" value={car.clientPhone || ''} onChange={e => setCar({ ...car, clientPhone: e.target.value })} placeholder="+380XXXXXXXXX" />
          </div>
        </div>

        <button id="save-vehicle-btn" onClick={onSave}
          className="w-full mt-5 py-3.5 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] t-accent-gradient t-accent-shadow"
          style={{ color: 'var(--t-text-on-accent)' }}>
          Зберегти дані авто
        </button>
      </div>

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
              <button 
                onClick={() => {
                  if (onSwitchCar) onSwitchCar(existingCarAlert.id);
                  setExistingCarAlert(null);
                }}
                className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'var(--t-accent-primary)', color: 'var(--t-text-on-accent)' }}
              >
                Перейти до автомобіля <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setExistingCarAlert(null)}
                className="w-full py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
                style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-primary)' }}
              >
                Закрити
              </button>
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
