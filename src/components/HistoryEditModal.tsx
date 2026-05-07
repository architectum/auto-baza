import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { HistoryEntry } from '../types';

const TYPE_LABELS: Record<string, string> = {
  problem: 'Проблема',
  solution: 'Рішення',
  note: 'Нотатка',
  mileage: 'Пробіг',
};

interface Props {
  entry: HistoryEntry;
  onSave: (updated: Partial<HistoryEntry>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function HistoryEditModal({ entry, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState(entry.type);
  const [text, setText] = useState(entry.text || '');
  const [mileage, setMileage] = useState(entry.runtimeMileage || 0);
  const isMileage = entry.type === 'mileage';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl p-5 border animate-fade-in-up"
        style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--t-text-primary)' }}>Редагувати запис</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isMileage && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Тип запису</label>
            <div className="flex gap-2 mb-4">
              {(['note', 'problem', 'solution'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: type === t ? 'var(--t-accent-primary)' : 'var(--t-surface-elevated)',
                    color: type === t ? 'var(--t-text-on-accent)' : 'var(--t-text-secondary)',
                  }}
                >{TYPE_LABELS[t]}</button>
              ))}
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Текст</label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus resize-none mb-4"
              style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)', minHeight: '6rem' }}
            />
          </>
        )}

        {isMileage && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Пробіг (км)</label>
            <input type="number" value={mileage || ''} onChange={e => setMileage(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus mb-4"
              style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
            />
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onDelete}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
          >
            <Trash2 className="w-4 h-4" /> Видалити
          </button>
          <button onClick={() => onSave(isMileage ? { runtimeMileage: mileage, text: `Оновлено пробіг: ${mileage} км` } : { type, text })}
            className="flex-1 py-3 rounded-xl font-semibold text-base transition-all active:scale-95 t-accent-gradient"
            style={{ color: 'var(--t-text-on-accent)' }}
          >Зберегти</button>
        </div>
      </div>
    </div>
  );
}
