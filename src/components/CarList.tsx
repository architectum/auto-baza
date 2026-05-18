import { useState, useEffect } from 'react';
import { db, auth, logEvent } from '../services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Car, HistoryEntry } from '../types';
import { Search, Plus, User, Phone, LogOut, BarChart3, AlertCircle, Wrench } from './Icons';
import { buildFirestoreErrorDetails, OperationType } from '../lib/utils';
import { useErrorModal } from './ErrorModal';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Logo } from './Logo';
import { SettingsSheet } from './SettingsSheet';
import { LicensePlate } from './LicensePlate';
import { InstructionSheet } from './InstructionSheet';

interface CarProblemStats {
  openProblems: number;
  solvedProblems: number;
}

export function CarList({ onSelect, onAddNew, onOpenStats, userId }: { onSelect: (car: Car) => void, onAddNew: () => void, onOpenStats?: () => void, userId: string }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { showError } = useErrorModal();
  const [carStats, setCarStats] = useState<Record<string, CarProblemStats>>({});

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

  // Subscribe to history for each car to get problem stats
  useEffect(() => {
    if (cars.length === 0) {
      setCarStats({});
      return;
    }

    const unsubscribers: (() => void)[] = [];

    cars.forEach(car => {
      if (!car.id) return;
      const histQ = query(collection(db, 'cars', car.id, 'history'));
      const unsub = onSnapshot(histQ, snap => {
        const entries = snap.docs.map(d => d.data() as HistoryEntry);
        const problems = entries.filter(e => e.type === 'problem');
        const openProblems = problems.filter(p => !p.linkedSolutionId).length;
        const solvedProblems = problems.filter(p => !!p.linkedSolutionId).length;

        setCarStats(prev => ({
          ...prev,
          [car.id!]: { openProblems, solvedProblems },
        }));
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(u => u());
  }, [cars]);

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
              {onOpenStats && (
                <button
                  id="stats-btn"
                  onClick={onOpenStats}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{
                    background: 'var(--t-accent-primary-muted)',
                    color: 'var(--t-text-accent)',
                  }}
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
              )}
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
            {filtered.map(car => {
              const stats = car.id ? carStats[car.id] : undefined;
              const hasOpenProblems = (stats?.openProblems ?? 0) > 0;

              return (
                <button
                  key={car.id}
                  id={`car-${car.id}`}
                  onClick={() => onSelect(car)}
                  className="w-full mb-3 rounded-2xl border p-4 flex flex-col gap-2.5 text-left active:scale-[0.98] group relative overflow-hidden"
                  style={{
                    background: 'var(--t-surface-card)',
                    borderColor: 'var(--t-border-default)',
                  }}
                >
                  {/* Top accent line — red if open problems, themed otherwise */}
                  <div 
                    className="absolute inset-x-0 top-0 h-1 pointer-events-none"
                    style={{
                      background: hasOpenProblems
                        ? 'linear-gradient(90deg, var(--t-status-problem), color-mix(in srgb, var(--t-status-problem) 70%, var(--t-accent-gradient-to)))'
                        : 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))',
                    }}
                  />
                  
                  <div className="flex items-center justify-between w-full gap-3 relative z-10">
                    <LicensePlate plate={car.plate} />

                    <div className="flex items-center gap-3 shrink-0">
                      {car.updatedAt && (
                        <span
                          className="text-xs truncate font-medium"
                          style={{ color: 'var(--t-text-muted)' }}
                        >
                          {formatDistanceToNow(new Date(car.updatedAt), { addSuffix: true, locale: uk })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 relative z-10 flex justify-between items-end mt-2">
                    <div className="flex-1">
                      <h3
                        className="font-bold text-lg leading-tight truncate pr-2"
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
                    
                    {/* Problem/solution stats badges in bottom right */}
                    {stats && (stats.openProblems > 0 || stats.solvedProblems > 0) && (
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                        {stats.openProblems > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shadow-sm"
                            style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            {stats.openProblems}
                          </span>
                        )}
                        {stats.solvedProblems > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shadow-sm"
                            style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}>
                            <Wrench className="w-3.5 h-3.5" />
                            {stats.solvedProblems}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Background Avatar */}
                  {car.avatarUrl && (
                    <div className="absolute right-[-10%] top-[-20%] bottom-[-20%] w-[50%] pointer-events-none opacity-15 mix-blend-luminosity z-0"
                         style={{ maskImage: 'linear-gradient(to right, transparent, black 80%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 80%)' }}>
                      <img src={car.avatarUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </button>
              );
            })}

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
