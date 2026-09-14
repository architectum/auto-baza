import { BODY_TYPES } from '../constants';
import { useLanguage } from '@shared/i18n';

interface BodyTypePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function BodyTypePicker({ value, onChange }: BodyTypePickerProps) {
  const { language, t } = useLanguage();

  return (
    <div className="flex flex-col gap-1.5 justify-end">
      <label className="text-xs font-semibold uppercase tracking-wider px-0.5" style={{ color: 'var(--t-text-muted)' }}>
        {t('cars.bodyType')}
      </label>
      <select value={value?.toLowerCase() || ''} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
        style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
        <option value="">{t('cars.selectBodyType')}</option>
        {BODY_TYPES.map(b => (
          <option key={b.value} value={b.value}>
            {language === 'en' ? b.enLabel : b.label}
          </option>
        ))}
      </select>
    </div>
  );
}
