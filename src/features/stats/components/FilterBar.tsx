import { useState } from 'react';
import { X, Car as CarIcon } from '@shared/icons/Icons';
import { useLanguage } from '@shared/i18n';

interface FilterBarProps {
  availableMakes: string[];
  selectedMakes: string[];
  onChangeFilter: (makes: string[]) => void;
}

export function FilterBar({ availableMakes, selectedMakes, onChangeFilter }: FilterBarProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (availableMakes.length <= 1) return null;

  const toggleMake = (make: string) => {
    if (selectedMakes.includes(make)) {
      onChangeFilter(selectedMakes.filter(m => m !== make));
    } else {
      onChangeFilter([...selectedMakes, make]);
    }
  };

  const clearFilter = () => onChangeFilter([]);

  const isFiltered = selectedMakes.length > 0;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] border cursor-pointer"
        style={{
          background: isFiltered ? 'var(--t-accent-primary-muted)' : 'var(--t-surface-elevated)',
          borderColor: isFiltered ? 'var(--t-border-accent)' : 'var(--t-border-default)',
          color: isFiltered ? 'var(--t-text-accent)' : 'var(--t-text-secondary)',
        }}
      >
        <CarIcon className="w-3.5 h-3.5" />
        {isFiltered ? t('stats.filterActiveMakes', { count: selectedMakes.length }) : t('stats.filterMakes')}
        {isFiltered && (
          <span
            onClick={(e) => { e.stopPropagation(); clearFilter(); }}
            className="w-4 h-4 rounded-full flex items-center justify-center ml-1 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          className="mt-2 flex flex-wrap gap-1.5 p-3 rounded-xl border animate-fade-in"
          style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
        >
          {availableMakes.map(make => {
            const active = selectedMakes.includes(make);
            return (
              <button
                key={make}
                onClick={() => toggleMake(make)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 border cursor-pointer"
                style={{
                  background: active ? 'var(--t-accent-primary)' : 'var(--t-surface-elevated)',
                  color: active ? 'var(--t-text-on-accent)' : 'var(--t-text-secondary)',
                  borderColor: active ? 'var(--t-accent-primary)' : 'var(--t-border-default)',
                }}
              >
                {make}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
