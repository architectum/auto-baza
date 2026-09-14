import { useState, useEffect } from 'react';
import { db, auth, logEvent } from '@services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Car, HistoryEntry } from '@types';
import { Search, Plus, User, Phone, LogOut, BarChart3, AlertCircle, Wrench } from '@shared/icons/Icons';
import { buildFirestoreErrorDetails, OperationType } from '@shared/lib/errorUtils';
import { useErrorModal } from '@shared/lib/errorContext';
import { formatDistanceToNow } from 'date-fns';
import { Logo } from '@shared/ui/Logo';
import { SettingsSheet } from '@features/settings/SettingsSheet';
import { LicensePlate } from './LicensePlate';
import { InstructionSheet } from '@features/settings/InstructionSheet';
import { CarCardSkeleton } from '@shared/ui/Skeleton';
import { Button } from '@shared/ui/Button';
import { Badge } from '@shared/ui/Badge';
import { EmptyState } from '@shared/ui/EmptyState';
import { useApp } from '@shared/context/AppContext';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/i18n';
import { useNavigate } from 'react-router-dom';


interface CarProblemStats {
  openProblems: number;
  solvedProblems: number;
  hasPendingReminder: boolean;
}

export function CarList() {
  const navigate = useNavigate();
  const { cars, loading } = useApp();
  const { signOut } = useAuth();
  const { t, dateLocale } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const { showError } = useErrorModal();
  const [carStats, setCarStats] = useState<Record<string, CarProblemStats>>({});

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
        const hasPendingReminder = false;

        setCarStats(prev => ({
          ...prev,
          [car.id!]: { openProblems, solvedProblems, hasPendingReminder },
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
                {t('auth.appTitle')}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="icon"
                size="md"
                id="stats-btn"
                onClick={() => navigate('/stats')}
                title={t('nav.statistics')}
                style={{
                  background: 'var(--t-accent-primary-muted)',
                  color: 'var(--t-text-accent)',
                }}
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
              <InstructionSheet />
              <SettingsSheet />
              <Button
                variant="icon"
                size="md"
                id="logout-btn"
                title={t('nav.logout')}
                onClick={() => signOut()}
              >
                <LogOut className="w-5 h-5" />
              </Button>
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
              placeholder={t('cars.searchPlaceholder')}
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {filtered.map(car => {
              const stats = car.id ? carStats[car.id] : undefined;
              const hasOpenProblems = (stats?.openProblems ?? 0) > 0;
              const hasPendingReminder = stats?.hasPendingReminder ?? false;

              return (
                <button
                  key={car.id}
                  id={`car-${car.id}`}
                  onClick={() => navigate(`/car/${car.id}`)}
                  className="w-full mb-3 rounded-2xl border p-4 flex flex-col gap-2.5 text-left active:scale-[0.98] group relative overflow-hidden"
                  style={{
                    background: 'var(--t-surface-card)',
                    borderColor: 'var(--t-border-default)',
                  }}
                >
                  {/* Top accent line — yellow if pending reminders, red if open problems, themed otherwise */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 pointer-events-none"
                    style={{
                      background: hasPendingReminder
                        ? 'linear-gradient(90deg, var(--t-status-reminder), color-mix(in srgb, var(--t-status-reminder) 70%, var(--t-accent-gradient-to)))'
                        : hasOpenProblems
                          ? 'linear-gradient(90deg, var(--t-status-problem), color-mix(in srgb, var(--t-status-problem) 70%, var(--t-accent-gradient-to)))'
                          : 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))',
                    }}
                  />

                  <div className="flex items-center justify-between w-full gap-3 relative z-10">
                    <LicensePlate
                      plate={car.plate}
                      country={car.country}
                      plateColor={car.plateColor}
                      plateForm={car.plateForm}
                    />

                    <div className="flex items-center gap-3 shrink-0">
                      {car.updatedAt && (
                        <span
                          className="text-xs truncate font-medium"
                          style={{ color: 'var(--t-text-muted)' }}
                        >
                          {formatDistanceToNow(new Date(car.updatedAt), { addSuffix: true, locale: dateLocale })}
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
                        {car.make || t('common.unknown')} {car.model}{' '}
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
                          <span className="truncate max-w-[140px]">{car.clientName || t('common.notSpecified')}</span>
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--t-surface-input)' }}>
                          <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t-accent-primary)' }} />
                          <span className="truncate font-mono">{car.clientPhone || t('common.notSpecified')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Problem/solution stats badges in bottom right */}
                    {stats && (stats.openProblems > 0 || stats.solvedProblems > 0) && (
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                        {stats.openProblems > 0 && (
                          <Badge variant="danger" icon={<AlertCircle className="w-3.5 h-3.5" />}>
                            {stats.openProblems}
                          </Badge>
                        )}
                        {stats.solvedProblems > 0 && (
                          <Badge variant="success" icon={<Wrench className="w-3.5 h-3.5" />}>
                            {stats.solvedProblems}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Background Photo */}
                  {car.photoUrl && (
                    <div className="absolute right-[-8%] top-[-15%] bottom-[-15%] w-[42%] pointer-events-none mix-blend-luminosity z-0"
                      style={{
                        opacity: 0.45,
                        maskImage: 'linear-gradient(to right, transparent, black 80%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 80%)'
                      }}>
                      <img src={car.photoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </button>
              );
            })}

            {!loading && filtered.length === 0 && (
              <EmptyState
                icon={<Logo className="w-10 h-10 drop-shadow-md" />}
                title={t('cars.notFound')}
                description={searchTerm ? t('cars.notFoundSearch') : t('cars.notFoundEmpty')}
                actionLabel={!searchTerm ? t('cars.addCar') : undefined}
                actionIcon={!searchTerm ? <Plus className="w-5 h-5" /> : undefined}
                onAction={!searchTerm ? () => navigate('/car/new') : undefined}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Button
        id="add-car-fab"
        variant="primary"
        onClick={() => navigate('/car/new')}
        title={t('cars.addCar')}
        className="!fixed bottom-6 right-6 !w-16 !h-16 !rounded-2xl z-20 t-accent-gradient t-accent-shadow"
        style={{ color: 'var(--t-text-on-accent)', padding: 0 }}
      >
        <Plus className="w-7 h-7" />
      </Button>
    </div>
  );
}
