import { useState } from 'react';
import { X, Check, ArrowRight } from './Icons';

interface Conflict {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface Props {
  conflicts: Conflict[];
  onResolve: (resolutions: Record<string, string>) => void;
  onClose: () => void;
}

export function MergeConflictModal({ conflicts, onResolve, onClose }: Props) {
  const [choices, setChoices] = useState<Record<string, 'old' | 'new'>>(
    Object.fromEntries(conflicts.map(c => [c.field, 'new']))
  );

  const handleSubmit = () => {
    const result: Record<string, string> = {};
    for (const c of conflicts) {
      result[c.field] = choices[c.field] === 'new' ? c.newValue : c.oldValue;
    }
    onResolve(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl p-5 border animate-fade-in-up max-h-[80vh] overflow-y-auto"
        style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--t-text-primary)' }}>Конфлікт даних</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>Оберіть які значення зберегти</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {conflicts.map(c => {
            const isNew = choices[c.field] === 'new';
            return (
              <div key={c.field} className="rounded-xl border p-3" style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)' }}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 px-0.5" style={{ color: 'var(--t-text-muted)' }}>{c.label}</label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setChoices(p => ({ ...p, [c.field]: 'old' }))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all"
                    style={{
                      background: !isNew ? 'var(--t-accent-primary-muted)' : 'var(--t-surface-card)',
                      color: !isNew ? 'var(--t-text-accent)' : 'var(--t-text-secondary)',
                      border: !isNew ? '1px solid var(--t-border-accent)' : '1px solid var(--t-border-default)',
                    }}
                  >
                    {!isNew && <Check className="w-4 h-4 shrink-0" />}
                    <span className="flex-1 truncate">{c.oldValue}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">поточне</span>
                  </button>
                  <button
                    onClick={() => setChoices(p => ({ ...p, [c.field]: 'new' }))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all"
                    style={{
                      background: isNew ? 'var(--t-status-solution-bg)' : 'var(--t-surface-card)',
                      color: isNew ? 'var(--t-status-solution)' : 'var(--t-text-secondary)',
                      border: isNew ? '1px solid color-mix(in srgb, var(--t-status-solution) 30%, transparent)' : '1px solid var(--t-border-default)',
                    }}
                  >
                    {isNew && <Check className="w-4 h-4 shrink-0" />}
                    <span className="flex-1 truncate">{c.newValue}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">нове (AI)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleSubmit}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-base transition-all active:scale-[0.98] t-accent-gradient"
          style={{ color: 'var(--t-text-on-accent)' }}
        >
          Застосувати
        </button>
      </div>
    </div>
  );
}

/** Field labels for conflict display */
export const FIELD_LABELS: Record<string, string> = {
  plate: 'Номерний знак',
  make: 'Марка',
  model: 'Модель',
  year: 'Рік випуску',
  color: 'Колір',
  bodyType: 'Тип кузова',
  clientName: "Ім'я клієнта",
  clientPhone: 'Телефон клієнта',
  note: 'Нотатки',
};

/**
 * Smart merge: fills empties silently, returns conflicts for non-empty fields.
 * Ignores null/undefined/0/empty-string from new data.
 */
export function smartMerge(
  current: Record<string, any>,
  incoming: Record<string, any>,
  fields: string[]
): { autoFilled: Record<string, any>; conflicts: Array<{ field: string; label: string; oldValue: string; newValue: string }> } {
  const autoFilled: Record<string, any> = {};
  const conflicts: Array<{ field: string; label: string; oldValue: string; newValue: string }> = [];

  for (const field of fields) {
    const newVal = incoming[field];
    const oldVal = current[field];

    // Skip if new value is empty/null/0
    if (newVal === null || newVal === undefined || newVal === '' || newVal === 0 || newVal === false) continue;

    const newStr = String(newVal).trim();
    if (!newStr) continue;

    const oldStr = oldVal ? String(oldVal).trim() : '';

    // If old is empty → auto-fill
    if (!oldStr || oldStr === '0') {
      autoFilled[field] = newVal;
    } else if (oldStr.toLowerCase() !== newStr.toLowerCase()) {
      // Conflict: both have values and they differ
      conflicts.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: oldStr,
        newValue: newStr,
      });
    }
    // If same value → skip
  }

  return { autoFilled, conflicts };
}
