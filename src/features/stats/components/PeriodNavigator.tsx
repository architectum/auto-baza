import { ChevronLeft, ChevronRight } from '@shared/icons/Icons';

interface PeriodNavigatorProps {
  title: string;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  isCurrent: boolean;
}

export function PeriodNavigator({
  title,
  periodLabel,
  onPrev,
  onNext,
  isCurrent,
}: PeriodNavigatorProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
        style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="text-center min-w-0">
        <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{title}</h3>
        <p className="text-xs font-medium capitalize mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{periodLabel}</p>
      </div>
      <button
        onClick={onNext}
        disabled={isCurrent}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-30"
        style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
