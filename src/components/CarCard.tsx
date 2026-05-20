import { Car } from '../types';
import { COLORS } from './CarForm';
import { Phone, ImageIcon, Sparkles, Loader2 } from './Icons';

export function CarCard({
  car,
  onPhotoClick,
  onAvatarClick,
  onGenerateAvatar,
  isGeneratingAvatar
}: {
  car: Partial<Car>;
  onPhotoClick?: () => void;
  onAvatarClick?: () => void;
  onGenerateAvatar?: () => void;
  isGeneratingAvatar?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 border relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)', boxShadow: '0 16px 36px -28px rgba(0,0,0,0.45)' }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))' }} />

      {/* Car Photo */}
      {car.photoUrl && (
        <button
          onClick={onPhotoClick}
          className="w-full mb-4 rounded-xl overflow-hidden border relative group transition-all active:scale-[0.99]"
          style={{ borderColor: 'var(--t-border-default)' }}
        >
          <img
            src={car.photoUrl}
            alt={`${car.make} ${car.model}`}
            className="w-full h-44 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.25)' }}>
            <ImageIcon className="w-7 h-7 text-white" />
          </div>
        </button>
      )}

      <div className="flex gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold truncate leading-tight mb-3" style={{ color: 'var(--t-text-primary)' }}>
            {car.make} {car.model}
          </h2>
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            {car.year ? <span className="px-2.5 py-1 rounded-lg" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>{car.year}</span> : null}
            {car.mileage ? <span className="px-2.5 py-1 rounded-lg font-mono" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}>{car.mileage.toLocaleString()} км</span> : null}
            {car.color ? (
              <span className="px-2.5 py-1 rounded-lg capitalize flex items-center gap-1.5" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>
                {COLORS.find(c => c.value === car.color?.toLowerCase()) && (
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: COLORS.find(c => c.value === car.color?.toLowerCase())?.hex }} />
                )}
                {car.color}
              </span>
            ) : null}
            {car.bodyType ? <span className="px-2.5 py-1 rounded-lg capitalize" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>{car.bodyType}</span> : null}
          </div>
        </div>

        {/* TODO: Uncomment when fix billing */}
        {/* Avatar Zone */}
        {(onAvatarClick || onGenerateAvatar) && (
          <div className="w-28 h-28 shrink-0 rounded-xl border flex items-center justify-center overflow-hidden relative"
            style={{ borderColor: 'var(--t-border-subtle)', background: 'var(--t-surface-elevated)' }}>
            {car.avatarUrl ? (
              <button onClick={onAvatarClick} className="w-full h-full relative group">
                <img src={car.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
                  <ImageIcon className="w-7 h-7 text-white" />
                </div>
              </button>
            ) : (
              <button onClick={onGenerateAvatar} disabled={isGeneratingAvatar} className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity p-2 border-dashed border-2 m-1 rounded-lg border-transparent hover:border-current" style={{ color: 'var(--t-text-secondary)' }}>
                {isGeneratingAvatar ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-7 h-7" />
                    <span className="text-[10px] text-center font-bold uppercase leading-tight tracking-wide opacity-80 mt-1">Avatar</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--t-border-default)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Контакт клієнта</div>
            <div className="font-semibold text-base" style={{ color: 'var(--t-text-primary)' }}>{car.clientName || "Ім'я не вказано"}</div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--t-text-accent)' }}>{car.clientPhone || 'Телефон не вказано'}</div>
          </div>
          {car.clientPhone && (
            <a
              href={`tel:${car.clientPhone}`}
              className="w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0"
              style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>
        {car.note && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Загальні нотатки</div>
            <div className="text-sm whitespace-pre-wrap p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-secondary)', borderColor: 'var(--t-border-subtle)' }}>{car.note}</div>
          </div>
        )}
      </div>
    </div>
  );
}
