import React, { useState } from 'react';
import { X, Trash2, Activity } from 'lucide-react';
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--t-text-primary)' }}>
            {isMileage ? 'Запис пробігу' : 'Редагувати запис'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {isMileage ? (
          /* Mileage entry — read-only display, only delete is available */
          <div className="mb-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--t-status-mileage-bg)', borderColor: 'color-mix(in srgb, var(--t-status-mileage) 30%, transparent)' }}>
              <Activity className="w-6 h-6 shrink-0" style={{ color: 'var(--t-status-mileage)' }} />
              <div>
                <span className="text-2xl font-bold font-mono" style={{ color: 'var(--t-status-mileage)' }}>
                  {(entry.runtimeMileage || 0).toLocaleString()}
                </span>
                <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--t-status-mileage)' }}>км</span>
              </div>
            </div>
            <p className="text-xs mt-2.5 px-1" style={{ color: 'var(--t-text-muted)' }}>
              Щоб змінити пробіг — видаліть цей запис та додайте новий з правильним значенням.
            </p>
          </div>
        ) : (
          /* Non-mileage entry — editable type & text, read-only mileage */
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
            {/* Read-only mileage display */}
            {entry.runtimeMileage > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl border" style={{ background: 'var(--t-surface-elevated)', borderColor: 'var(--t-border-default)' }}>
                <Activity className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-muted)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Пробіг:</span>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--t-text-secondary)' }}>{entry.runtimeMileage.toLocaleString()} км</span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onDelete}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
          >
            <Trash2 className="w-4 h-4" /> Видалити
          </button>
          {!isMileage && (
            <button onClick={() => onSave({ type, text })}
              className="flex-1 py-3 rounded-xl font-semibold text-base transition-all active:scale-95 t-accent-gradient"
              style={{ color: 'var(--t-text-on-accent)' }}
            >Зберегти</button>
          )}
          {isMileage && (
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-base transition-all active:scale-95"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >Закрити</button>
          )}
        </div>
      </div>
    </div>
  );
}
