import { useLanguage } from '../i18n';
import { haptic } from '../lib/haptic';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onClose: (value: boolean) => void;
}

export function ConfirmDialog({ title, message, onClose }: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--t-surface-overlay, rgba(0,0,0,0.6))' }}>
      <div 
        className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl animate-scale-in"
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
        }}
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              haptic.light();
              onClose(false);
            }}
          >
            {t('common.no')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              haptic.medium();
              onClose(true);
            }}
          >
            {t('common.yes')}
          </Button>
        </div>
      </div>
    </div>
  );
}
