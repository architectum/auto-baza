import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { ArrowLeft, Edit2, Check, AlertCircle, Wrench, Info, Activity, CalendarDays, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { VoiceAssistant } from './VoiceAssistant';
import { PhotoAssistant } from './PhotoAssistant';

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
  'Седан', 'Хетчбек', 'Універсал', 'Позашляховик / Кросовер', 
  'Купе', 'Мінівен', 'Пікап', 'Кабріолет', 'Фургон'
].map(t => ({ label: t, value: t.toLowerCase() }));

function StatusIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5";
  if (type === 'problem') return <AlertCircle className={iconClass} />;
  if (type === 'solution') return <Wrench className={iconClass} />;
  if (type === 'mileage') return <Activity className={iconClass} />;
  return <Info className={iconClass} />;
}

function getStatusClasses(type: string): { color: string; bg: string } {
  switch (type) {
    case 'problem': return { color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' };
    case 'solution': return { color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' };
    case 'mileage': return { color: 'var(--t-status-mileage)', bg: 'var(--t-status-mileage-bg)' };
    default: return { color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' };
  }
}

const TYPE_LABELS: Record<string, string> = {
  problem: 'проблема',
  solution: 'рішення',
  note: 'нотатка',
  mileage: 'пробіг',
};

// Styled input with themed colors
function ThemedInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5"
        style={{ color: 'var(--t-text-muted)' }}
      >
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus"
        style={{
          background: 'var(--t-surface-input)',
          color: 'var(--t-text-primary)',
          borderColor: 'var(--t-border-default)',
          ...(props.style || {}),
        }}
      />
    </div>
  );
}

export function CarProfile({ carPlate, userId, onBack }: { carPlate: string | null, userId: string, onBack: () => void }) {
  const [car, setCar] = useState<Partial<Car>>({ plate: carPlate || '' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(!carPlate);
  const [loading, setLoading] = useState(!!carPlate);
  const [hasYear, setHasYear] = useState(false);

  useEffect(() => {
    if (!carPlate) {
      setLoading(false);
      return;
    }
    const fetchCar = async () => {
      try {
        const docRef = doc(db, 'cars', carPlate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Car;
          setCar(data);
          setHasYear(!!data.year);
        } else {
          setIsEditing(true);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `cars/${carPlate}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCar();

    const q = query(collection(db, 'cars', carPlate, 'history'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry));
      setHistory(data);
    }, err => {
      handleFirestoreError(err, OperationType.LIST, `cars/${carPlate}/history`);
    });
    return unsub;
  }, [carPlate]);

  const handleSaveCar = async () => {
    if (!car.plate) return alert('Номерний знак обовʼязковий');
    try {
      const docRef = doc(db, 'cars', car.plate.toUpperCase());
      const now = new Date().toISOString();
      const payload = {
        ...car,
        plate: car.plate.toUpperCase(),
        ownerId: userId,
        updatedAt: now,
        createdAt: car.createdAt || now
      };
      
      const finalPayload = {
        plate: payload.plate || '',
        ownerId: payload.ownerId || '',
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        make: payload.make || '',
        model: payload.model || '',
        year: hasYear ? (Number(payload.year) || 0) : 0,
        mileage: payload.mileage || 0,
        color: payload.color || '',
        bodyType: payload.bodyType || '',
        clientName: payload.clientName || '',
        clientPhone: payload.clientPhone || '',
        note: payload.note || ''
      };
      
      const exists = (await getDoc(docRef)).exists();
      if (!exists) {
        await setDoc(docRef, finalPayload);
      } else {
        await updateDoc(docRef, finalPayload);
      }
      setCar(finalPayload);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `cars/${car.plate}`);
    }
  };

  const handleAIExtractedData = (data: Partial<Car>) => {
    setCar(prev => ({
      ...prev,
      ...data,
      plate: data.plate ? data.plate.toUpperCase() : prev.plate
    }));
    if (data.year) setHasYear(true);
    setIsEditing(true);
  };

  const handleCreateHistory = async (data: Partial<HistoryEntry>) => {
    if (!car.plate) return;
    try {
      const newMileage = data.runtimeMileage || car.mileage || 0;
      let mileageDiff = 0;
      if (car.mileage && newMileage) {
        mileageDiff = newMileage - car.mileage;
      }
      
      const payload = {
        type: data.type || 'note',
        text: data.text || '',
        runtimeMileage: newMileage,
        mileageDiff,
        authorId: userId,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'cars', car.plate, 'history'), payload);

      if (newMileage > (car.mileage || 0)) {
        await updateDoc(doc(db, 'cars', car.plate), {
          mileage: newMileage,
          updatedAt: new Date().toISOString()
        });
        setCar(prev => ({ ...prev, mileage: newMileage }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `cars/${car.plate}/history`);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--t-surface-bg)' }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{
            borderColor: 'var(--t-border-default)',
            borderTopColor: 'var(--t-accent-primary)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-dvh max-w-lg mx-auto"
      style={{ background: 'var(--t-surface-bg)' }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 safe-top glass border-b"
        style={{
          background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)',
          borderColor: 'var(--t-border-default)',
        }}
      >
        <div className="flex items-center justify-between px-3 py-3 gap-3">
          <button
            id="back-btn"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
            style={{
              background: 'var(--t-surface-elevated)',
              color: 'var(--t-text-secondary)',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className="font-mono font-bold px-3 py-1.5 rounded-lg text-sm tracking-widest uppercase text-center truncate"
            style={{
              background: 'var(--t-surface-elevated)',
              color: 'var(--t-text-primary)',
              border: '1px solid var(--t-border-default)',
            }}
          >
            {car.plate || 'НОВЕ АВТО'}
          </div>

          <button
            id="edit-save-btn"
            onClick={() => isEditing ? handleSaveCar() : setIsEditing(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
            style={{
              background: isEditing ? 'var(--t-status-solution-bg)' : 'var(--t-accent-primary-muted)',
              color: isEditing ? 'var(--t-status-solution)' : 'var(--t-text-accent)',
            }}
          >
            {isEditing ? <Check className="w-5 h-5" /> : <Edit2 className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {isEditing ? (
          <div
            className="rounded-2xl p-5 border animate-fade-in-up"
            style={{
              background: 'var(--t-surface-card)',
              borderColor: 'var(--t-border-default)',
            }}
          >
            {/* AI auto-fill bar */}
            <div
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl mb-5"
              style={{
                background: 'var(--t-accent-primary-muted)',
                border: '1px solid var(--t-border-accent)',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--t-text-accent)' }}
              >
                Автозаповнення AI
              </span>
              <div className="flex items-center gap-3">
                <PhotoAssistant onDataExtracted={handleAIExtractedData} />
                <VoiceAssistant context="car" onDataExtracted={handleAIExtractedData} className="!flex-row" />
              </div>
            </div>
            
            {/* Form fields */}
            <div className="space-y-4">
              <ThemedInput
                label="Номерний знак"
                type="text"
                value={car.plate || ''}
                onChange={e => setCar({...car, plate: e.target.value.toUpperCase()})}
                placeholder="AX-1234-BB"
                disabled={!!carPlate}
                style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />

              <div className="grid grid-cols-2 gap-3">
                <ThemedInput label="Марка" type="text" value={car.make || ''} onChange={e => setCar({...car, make: e.target.value})} />
                <ThemedInput label="Модель" type="text" value={car.model || ''} onChange={e => setCar({...car, model: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 justify-end">
                  <div className="flex items-center justify-between px-0.5">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Рік випуску</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                      <input type="checkbox" checked={hasYear} onChange={e => {
                        setHasYear(e.target.checked);
                        if (!e.target.checked) setCar({ ...car, year: 0 });
                      }} className="rounded" />
                      Вказати
                    </label>
                  </div>
                  <select
                    value={car.year || ''}
                    onChange={e => setCar({...car, year: parseInt(e.target.value)})}
                    disabled={!hasYear}
                    className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--t-surface-input)',
                      color: 'var(--t-text-primary)',
                      borderColor: 'var(--t-border-default)',
                    }}
                  >
                    <option value="" disabled>Оберіть рік</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="text-xs font-semibold uppercase tracking-wider px-0.5" style={{ color: 'var(--t-text-muted)' }}>Тип кузова</label>
                  <select
                    value={car.bodyType?.toLowerCase() || ''}
                    onChange={e => setCar({...car, bodyType: e.target.value})}
                    className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus"
                    style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
                  >
                    <option value="">Не обрано</option>
                    {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Колір</label>
                <div className="flex items-center gap-2">
                  {car.color && COLORS.find(c => c.value === car.color?.toLowerCase()) && (
                    <div 
                      className="w-11 h-11 rounded-full border shadow-sm shrink-0" 
                      style={{ 
                        backgroundColor: COLORS.find(c => c.value === car.color?.toLowerCase())?.hex || '#fff',
                        borderColor: 'var(--t-border-default)' 
                      }} 
                    />
                  )}
                  <select
                    value={car.color?.toLowerCase() || ''}
                    onChange={e => setCar({...car, color: e.target.value})}
                    className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus"
                    style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
                  >
                    <option value="">Не обрано</option>
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Client section */}
              <div
                className="pt-5 mt-2 border-t"
                style={{ borderColor: 'var(--t-border-default)' }}
              >
                <h3
                  className="font-semibold mb-3"
                  style={{ color: 'var(--t-text-secondary)' }}
                >
                  Інформація про клієнта
                </h3>
                <div className="space-y-3">
                  <ThemedInput label="Ім'я" type="text" value={car.clientName || ''} onChange={e => setCar({...car, clientName: e.target.value})} />
                  <ThemedInput label="Телефон" type="text" value={car.clientPhone || ''} onChange={e => setCar({...car, clientPhone: e.target.value})} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5"
                  style={{ color: 'var(--t-text-muted)' }}
                >
                  Нотатки
                </label>
                <textarea
                  value={car.note || ''}
                  onChange={e => setCar({...car, note: e.target.value})}
                  placeholder="Загальні проблеми або побажання..."
                  className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none transition-shadow t-focus resize-none"
                  style={{
                    background: 'var(--t-surface-input)',
                    color: 'var(--t-text-primary)',
                    borderColor: 'var(--t-border-default)',
                    minHeight: '5rem',
                  }}
                />
              </div>

              <button
                id="save-vehicle-btn"
                onClick={handleSaveCar}
                className="w-full mt-4 py-3.5 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] t-accent-gradient t-accent-shadow"
                style={{ color: 'var(--t-text-on-accent)' }}
              >
                Зберегти дані авто
              </button>
            </div>
          </div>
        ) : (
          /* Read-only vehicle card */
          <div
            className="rounded-2xl p-5 border animate-fade-in-up"
            style={{
              background: 'var(--t-surface-card)',
              borderColor: 'var(--t-border-default)',
            }}
          >
            <h2
              className="text-2xl font-bold truncate leading-tight mb-3"
              style={{ color: 'var(--t-text-primary)' }}
            >
              {car.make} {car.model}
            </h2>

            <div className="flex flex-wrap gap-2 text-sm font-medium mb-5">
              {car.year && (
                <span
                  className="px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
                >
                  {car.year}
                </span>
              )}
              {car.mileage && (
                <span
                  className="px-2.5 py-1 rounded-lg font-mono"
                  style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}
                >
                  {car.mileage.toLocaleString()} км
                </span>
              )}
              {car.color && (
                <span
                  className="px-2.5 py-1 rounded-lg capitalize flex items-center gap-1.5"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
                >
                  {COLORS.find(c => c.value === car.color?.toLowerCase()) && (
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" 
                      style={{ backgroundColor: COLORS.find(c => c.value === car.color?.toLowerCase())?.hex }}
                    />
                  )}
                  {car.color}
                </span>
              )}
              {car.bodyType && (
                <span
                  className="px-2.5 py-1 rounded-lg capitalize"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
                >
                  {car.bodyType}
                </span>
              )}
            </div>
            
            <div
              className="pt-4 border-t space-y-4"
              style={{ borderColor: 'var(--t-border-default)' }}
            >
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--t-text-muted)' }}
                >
                  Контакт клієнта
                </div>
                <div
                  className="font-semibold text-base"
                  style={{ color: 'var(--t-text-primary)' }}
                >
                  {car.clientName || 'Ім\'я не вказано'}
                </div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--t-text-accent)' }}
                >
                  {car.clientPhone || 'Телефон не вказано'}
                </div>
              </div>
              {car.note && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--t-text-muted)' }}
                  >
                    Загальні нотатки
                  </div>
                  <div
                    className="text-sm whitespace-pre-wrap p-3 rounded-xl border"
                    style={{
                      background: 'var(--t-surface-input)',
                      color: 'var(--t-text-secondary)',
                      borderColor: 'var(--t-border-subtle)',
                    }}
                  >
                    {car.note}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service History */}
        {!isEditing && carPlate && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-5 px-1 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}
                >
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: 'var(--t-text-primary)' }}
                >
                  Історія обслуговування
                </h3>
              </div>
              <button 
                onClick={() => {
                  const newMileageStr = window.prompt('Введіть новий пробіг (км):', car.mileage ? String(car.mileage) : '');
                  if (newMileageStr) {
                    const newMileage = parseInt(newMileageStr, 10);
                    if (!isNaN(newMileage) && newMileage > 0) {
                      handleCreateHistory({ type: 'mileage', runtimeMileage: newMileage, text: 'Оновлено пробіг' });
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 shrink-0 border"
                style={{ 
                  background: 'var(--t-status-mileage-bg)', 
                  color: 'var(--t-status-mileage)',
                  borderColor: 'color-mix(in srgb, var(--t-status-mileage) 30%, transparent)' 
                }}
              >
                <Activity className="w-4 h-4" />
                Додати пробіг
              </button>
            </div>
            
            <div className="space-y-3 stagger-children">
              {history.map((entry) => {
                const status = getStatusClasses(entry.type);
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 items-start"
                  >
                    {/* Status indicator */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: status.bg, color: status.color }}
                    >
                      <StatusIcon type={entry.type} />
                    </div>

                    {/* Entry card */}
                    <div
                      className="flex-1 min-w-0 rounded-2xl border p-4"
                      style={{
                        background: 'var(--t-surface-card)',
                        borderColor: 'var(--t-border-default)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded-md"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {TYPE_LABELS[entry.type] || entry.type}
                        </span>
                        <time
                          className="text-xs font-mono shrink-0"
                          style={{ color: 'var(--t-text-muted)' }}
                        >
                          {new Date(entry.createdAt).toLocaleDateString()}{' '}
                          {new Date(entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </time>
                      </div>

                      {entry.text && (
                        <p
                          className="text-sm mt-2 whitespace-pre-wrap leading-relaxed"
                          style={{ color: 'var(--t-text-secondary)' }}
                        >
                          {entry.text}
                        </p>
                      )}

                      {(entry.runtimeMileage || entry.mileageDiff > 0) && (
                        <div
                          className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t"
                          style={{ borderColor: 'var(--t-border-subtle)' }}
                        >
                          {entry.runtimeMileage && (
                            <span
                              className="text-xs font-mono font-medium px-2 py-0.5 rounded-md"
                              style={{
                                background: 'var(--t-surface-elevated)',
                                color: 'var(--t-text-secondary)',
                              }}
                            >
                              {entry.runtimeMileage.toLocaleString()} км
                            </span>
                          )}
                          {entry.mileageDiff > 0 && (
                            <span
                              className="text-xs font-medium flex items-center gap-1"
                              style={{ color: 'var(--t-status-solution)' }}
                            >
                              ▲ +{entry.mileageDiff.toLocaleString()} км
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {history.length === 0 && (
                <div className="text-center py-16 animate-fade-in">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'var(--t-surface-elevated)' }}
                  >
                    <MessageSquare className="w-7 h-7" style={{ color: 'var(--t-text-muted)', opacity: 0.5 }} />
                  </div>
                  <p
                    className="text-base font-medium mb-1"
                    style={{ color: 'var(--t-text-secondary)' }}
                  >
                    Історія обслуговування поки порожня
                  </p>
                  <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
                    Натисніть мікрофон нижче, щоб надиктувати
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom voice bar */}
      {!isEditing && carPlate && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
          style={{
            background: `linear-gradient(to top, var(--t-surface-bg) 60%, transparent)`,
          }}
        >
          <div className="px-4 pb-5 pt-8 flex justify-center max-w-lg mx-auto">
            <div
              className="flex items-center gap-3 pl-5 pr-2 py-2 rounded-full border w-full glass"
              style={{
                background: 'color-mix(in srgb, var(--t-surface-card) 90%, transparent)',
                borderColor: 'var(--t-border-default)',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)',
              }}
            >
              <span
                className="text-sm font-semibold flex-1"
                style={{ color: 'var(--t-text-secondary)' }}
              >
                Надиктувати запис
              </span>
              <VoiceAssistant context="history" onDataExtracted={handleCreateHistory} className="!flex-row" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
