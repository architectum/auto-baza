import { ShieldAlert } from '@shared/icons/Icons';
import { useLanguage } from '@shared/i18n';

interface MileageToastProps {
  show: boolean;
}

export function MileageToast({ show }: MileageToastProps) {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
      <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-xl"
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'color-mix(in srgb, var(--t-status-problem) 40%, var(--t-border-default))',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3)',
        }}
      >
        <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: 'var(--t-status-problem)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--t-text-primary)' }}>
          {t('history.addMileageFirst')}
        </span>
      </div>
    </div>
  );
}
