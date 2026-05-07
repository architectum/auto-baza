import { useState } from 'react';
import { HistoryEntry } from '../types';
import { AlertCircle, Wrench, Info, Activity, CalendarDays, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { HistoryEditModal } from './HistoryEditModal';
import { TextHistoryInput } from './TextHistoryInput';
import { VoiceAssistant } from './VoiceAssistant';

function StatusIcon({ type }: { type: string }) {
  const c = "w-5 h-5";
  if (type === 'problem') return <AlertCircle className={c} />;
  if (type === 'solution') return <Wrench className={c} />;
  if (type === 'mileage') return <Activity className={c} />;
  return <Info className={c} />;
}

function getStatusClasses(type: string) {
  switch (type) {
    case 'problem': return { color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' };
    case 'solution': return { color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' };
    case 'mileage': return { color: 'var(--t-status-mileage)', bg: 'var(--t-status-mileage-bg)' };
    default: return { color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' };
  }
}

const TYPE_LABELS: Record<string, string> = { problem: 'проблема', solution: 'рішення', note: 'нотатка', mileage: 'пробіг' };

interface Props {
  history: HistoryEntry[];
  currentMileage: number;
  onCreateHistory: (data: Partial<HistoryEntry>) => void;
  onUpdateHistory: (id: string, data: Partial<HistoryEntry>) => void;
  onDeleteHistory: (id: string) => void;
}

export function ServiceHistory({ history, currentMileage, onCreateHistory, onUpdateHistory, onDeleteHistory }: Props) {
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-5 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}>
            <CalendarDays className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--t-text-primary)' }}>Історія обслуговування</h3>
        </div>
        <button
          onClick={() => {
            const v = window.prompt('Введіть новий пробіг (км):', currentMileage ? String(currentMileage) : '');
            if (v) { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) onCreateHistory({ type: 'mileage', runtimeMileage: n, text: 'Оновлено пробіг' }); }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 shrink-0 border"
          style={{ background: 'var(--t-status-mileage-bg)', color: 'var(--t-status-mileage)', borderColor: 'color-mix(in srgb, var(--t-status-mileage) 30%, transparent)' }}
        >
          <Activity className="w-4 h-4" /> Додати пробіг
        </button>
      </div>

      {/* Text input for manual history entry */}
      <div className="mb-4">
        <TextHistoryInput onSubmit={d => onCreateHistory({ type: d.type as any, text: d.text })} />
      </div>

      <div className="space-y-3 stagger-children">
        {history.map(entry => {
          const status = getStatusClasses(entry.type);
          return (
            <div key={entry.id} className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: status.bg, color: status.color }}>
                <StatusIcon type={entry.type} />
              </div>
              <div className="flex-1 min-w-0 rounded-2xl border p-4" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded-md" style={{ background: status.bg, color: status.color }}>
                    {TYPE_LABELS[entry.type] || entry.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingEntry(entry)} className="w-7 h-7 rounded-md flex items-center justify-center transition-all active:scale-90"
                      style={{ color: 'var(--t-text-muted)' }} title="Редагувати">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <time className="text-xs font-mono shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}{' '}
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
                {entry.text && <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>{entry.text}</p>}
                {(entry.runtimeMileage || entry.mileageDiff > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
                    {entry.runtimeMileage ? <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>{entry.runtimeMileage.toLocaleString()} км</span> : null}
                    {entry.mileageDiff > 0 ? <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--t-status-solution)' }}>▲ +{entry.mileageDiff.toLocaleString()} км</span> : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {history.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--t-surface-elevated)' }}>
              <MessageSquare className="w-7 h-7" style={{ color: 'var(--t-text-muted)', opacity: 0.5 }} />
            </div>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--t-text-secondary)' }}>Історія обслуговування поки порожня</p>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Надиктуйте або введіть текстом перший запис</p>
          </div>
        )}
      </div>

      {editingEntry && (
        <HistoryEditModal
          entry={editingEntry}
          onSave={updated => {
            if (editingEntry.id) onUpdateHistory(editingEntry.id, updated);
            setEditingEntry(null);
          }}
          onDelete={() => {
            if (editingEntry.id) onDeleteHistory(editingEntry.id);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
