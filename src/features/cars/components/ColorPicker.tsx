import { COLORS } from '../constants';
import { useLanguage } from '@shared/i18n';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { language, t } = useLanguage();
  const selectedColor = COLORS.find(c => c.value === value?.toLowerCase());

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>
        {t('cars.color')}
      </label>
      <div className="flex items-center gap-2">
        {value && selectedColor && (
          <div className="w-11 h-11 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: selectedColor.hex, borderColor: 'var(--t-border-default)' }} />
        )}
        <select value={value?.toLowerCase() || ''} onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
          style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
          <option value="">{t('cars.selectColor')}</option>
          {COLORS.map(c => (
            <option key={c.value} value={c.value}>
              {language === 'en' ? c.enLabel : c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
