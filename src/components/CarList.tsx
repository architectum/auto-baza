import { useState, useEffect } from 'react';
import { db, auth, logEvent } from '../services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Car } from '../types';
import { Search, Plus, User, Phone, LogOut } from 'lucide-react';
import { buildFirestoreErrorDetails, OperationType } from '../lib/utils';
import { useErrorModal } from './ErrorModal';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Logo } from './Logo';
import { SettingsSheet } from './SettingsSheet';
import { LicensePlate } from './LicensePlate';
import { InstructionSheet } from './InstructionSheet';
export function CarList({ onSelect, onAddNew, userId }: { onSelect: (car: Car) => void, onAddNew: () => void, userId: string }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { showError } = useErrorModal();

  useEffect(() => {
    setLoading(true);
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
      showError(buildFirestoreErrorDetails(err, OperationType.LIST, 'cars'));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const filtered = cars.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.plate?.toLowerCase().includes(term) ||
      c.clientPhone?.includes(searchTerm) ||
      c.clientName?.toLowerCase().includes(term) ||
      c.make?.toLowerCase().includes(term) ||
      c.model?.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 safe-top glass border-b"
        style={{
          background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)',
          borderColor: 'var(--t-border-default)',
        }}
      >
        <div className="px-4 pt-3 pb-3 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 t-accent-gradient"
              >
                <Logo className="w-5 h-5" style={{ color: 'var(--t-text-on-accent)' }} />
              </div>
              <h1
                className="text-xl font-bold tracking-tight truncate"
                style={{ color: 'var(--t-text-primary)' }}
              >
                АвтоБаза
              </h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <InstructionSheet />
              <SettingsSheet />
              <button
                id="logout-btn"
                onClick={() => {
                  logEvent('logout');
                  auth.signOut();
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
                style={{
                  background: 'var(--t-surface-elevated)',
                  color: 'var(--t-text-muted)',
                }}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none"
              style={{ color: 'var(--t-text-muted)' }}
            />
            <input
              id="search-input"
              type="text"
              placeholder="Пошук за номером, ім'ям, маркою або телефоном..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl pl-11 pr-4 py-3 text-sm font-medium border-none outline-none transition-shadow t-focus"
              style={{
                background: 'var(--t-surface-input)',
                color: 'var(--t-text-primary)',
              }}
            />
          </div>
        </div>
      </header>

      {/* Car list or Loader */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 max-w-lg mx-auto w-full stagger-children">
        {loading ? (
          // Skeleton Loader
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="w-full rounded-2xl border p-4 flex flex-col gap-3 animate-pulse"
                style={{
                  background: 'var(--t-surface-card)',
                  borderColor: 'var(--t-border-default)',
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="h-8 w-28 rounded-lg" style={{ background: 'var(--t-surface-elevated)' }}></div>
                  <div className="h-4 w-16 rounded" style={{ background: 'var(--t-surface-elevated)' }}></div>
                </div>
                <div className="space-y-2 mt-1">
                  <div className="h-6 w-48 rounded" style={{ background: 'var(--t-surface-elevated)' }}></div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 rounded" style={{ background: 'var(--t-surface-elevated)' }}></div>
                    <div className="h-4 w-32 rounded" style={{ background: 'var(--t-surface-elevated)' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filtered.map(car => (
              <button
                key={car.id}
                id={`car-${car.id}`}
                onClick={() => onSelect(car)}
                className="w-full mb-3 rounded-2xl border p-4 flex flex-col gap-2.5 text-left transition-all active:scale-[0.98] group relative overflow-hidden"
                style={{
                  background: 'var(--t-surface-card)',
                  borderColor: 'var(--t-border-default)',
                }}
              >
                {/* Subtle hover gradient */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'linear-gradient(120deg, transparent, var(--t-accent-primary-muted), transparent)',
                  }}
                />
                
                <div className="flex items-center justify-between w-full gap-3 relative z-10">
                  <LicensePlate plate={car.plate} />

                  {car.updatedAt && (
                    <span
                      className="text-xs truncate font-medium"
                      style={{ color: 'var(--t-text-muted)' }}
                    >
                      {formatDistanceToNow(new Date(car.updatedAt), { addSuffix: true, locale: uk })}
                    </span>
                  )}
                </div>

                <div className="min-w-0 relative z-10">
                  <h3
                    className="font-bold text-lg leading-tight truncate"
                    style={{ color: 'var(--t-text-primary)' }}
                  >
                    {car.make || 'Невідомо'} {car.model}{' '}
                    <span style={{ color: 'var(--t-text-muted)', fontWeight: 500 }}>
                      {car.year ? `'${String(car.year).slice(-2)}` : ''}
                    </span>
                  </h3>
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-medium"
                    style={{ color: 'var(--t-text-secondary)' }}
                  >
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--t-surface-input)' }}>
                      <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t-accent-primary)' }} />
                      <span className="truncate max-w-[140px]">{car.clientName || 'Не вказано'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--t-surface-input)' }}>
                      <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t-accent-primary)' }} />
                      <span className="truncate">{car.clientPhone || 'Не вказано'}</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-20 animate-fade-in">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner"
                  style={{ background: 'var(--t-accent-primary-muted)' }}
                >
                  <Logo className="w-10 h-10 drop-shadow-md" style={{ color: 'var(--t-accent-primary)', opacity: 0.8 }} />
                </div>
                <p
                  className="text-xl font-bold mb-2"
                  style={{ color: 'var(--t-text-primary)' }}
                >
                  Авто не знайдено
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>
                  Натисніть <Plus className="inline w-4 h-4" /> щоб додати перше авто
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        id="add-car-fab"
        onClick={onAddNew}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 z-20 t-accent-gradient t-accent-shadow"
        style={{ color: 'var(--t-text-on-accent)' }}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
