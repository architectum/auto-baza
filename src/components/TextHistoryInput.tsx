import { useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'note', label: 'Нотатка', color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' },
  { value: 'problem', label: 'Проблема', color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' },
  { value: 'solution', label: 'Рішення', color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' },
] as const;

interface Props {
  onSubmit: (data: { type: string; text: string }) => void;
}

export function TextHistoryInput({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<string>('note');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ type, text: text.trim() });
    setText('');
    setExpanded(false);
  };

  const selected = TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0];

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] border"
        style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)', color: 'var(--t-text-secondary)' }}
      >
        <Send className="w-4 h-4" />
        Додати текстовий запис
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-4 animate-fade-in-up" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
      <div className="flex gap-2 mb-3">
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: type === t.value ? t.bg : 'var(--t-surface-elevated)',
              color: type === t.value ? t.color : 'var(--t-text-muted)',
              border: type === t.value ? `1px solid color-mix(in srgb, ${t.color} 30%, transparent)` : '1px solid transparent',
            }}
          >{t.label}</button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Введіть текст запису..."
        autoFocus
        className="w-full rounded-xl px-3.5 py-3 text-sm font-medium border outline-none t-focus resize-none mb-3"
        style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)', minHeight: '5rem' }}
      />
      <div className="flex gap-2">
        <button onClick={() => { setExpanded(false); setText(''); }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
        >Скасувати</button>
        <button onClick={handleSubmit} disabled={!text.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 t-accent-gradient disabled:opacity-50"
          style={{ color: 'var(--t-text-on-accent)' }}
        >
          <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" />Додати {selected.label.toLowerCase()}</span>
        </button>
      </div>
    </div>
  );
}
