import { BODY_TYPES } from '../constants';

interface BodyTypePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function BodyTypePicker({ value, onChange }: BodyTypePickerProps) {
  return (
    <div className="flex flex-col gap-1.5 justify-end">
      <label className="text-xs font-semibold uppercase tracking-wider px-0.5" style={{ color: 'var(--t-text-muted)' }}>Тип кузова</label>
      <select value={value?.toLowerCase() || ''} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
        style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}>
        <option value="">Не обрано</option>
        {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
    </div>
  );
}
