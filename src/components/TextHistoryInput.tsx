import { useState, useRef } from 'react';
import { Send, Paperclip, X } from './Icons';

const TYPE_OPTIONS = [
  { value: 'note', label: 'Нотатка', color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' },
  { value: 'problem', label: 'Проблема', color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' },
  { value: 'solution', label: 'Рішення', color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' },
] as const;

interface Props {
  onSubmit: (data: { type: string; text: string; photoFile?: File; cost?: number }) => void;
  /** When true, the input is blocked (mileage must be added first) */
  disabled?: boolean;
  /** Called when user clicks the button while disabled */
  onDisabledClick?: () => void;
}

export function TextHistoryInput({ onSubmit, disabled, onDisabledClick }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<string>('note');
  const [cost, setCost] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ type, text: text.trim(), photoFile: photoFile || undefined, cost: type === 'solution' && cost ? Number(cost) : undefined });
    setText('');
    setCost('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setExpanded(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const selected = TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0];

  if (!expanded) {
    return (
      <button
        onClick={() => {
          if (disabled) {
            onDisabledClick?.();
            return;
          }
          setExpanded(true);
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold active:scale-[0.98] border"
        style={{
          background: disabled ? 'var(--t-surface-elevated)' : 'var(--t-surface-card)',
          borderColor: disabled ? 'var(--t-border-default)' : 'var(--t-border-accent)',
          color: disabled ? 'var(--t-text-muted)' : 'var(--t-text-secondary)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Send className="w-4 h-4" />
        Додати текстовий запис
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-accent)', boxShadow: '0 12px 32px -24px var(--t-accent-shadow)' }}>
      <div className="flex gap-2 mb-3">
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
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

      {type === 'solution' && (
        <div className="mb-3 relative">
          <input
            type="number"
            value={cost}
            onChange={e => setCost(e.target.value)}
            placeholder="Вартість рішення (грн)"
            min="0"
            step="0.01"
            className="w-full rounded-xl pl-3.5 pr-12 py-3 text-sm font-medium border outline-none t-focus"
            style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>
            ₴
          </span>
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (
        <div className="relative mb-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--t-border-default)' }}>
          <img src={photoPreview} alt="Фото" className="w-full h-28 object-cover" />
          <button
            onClick={removePhoto}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setExpanded(false); setText(''); setCost(''); removePhoto(); }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
        >Скасувати</button>

        {/* Photo attach button */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={photoInputRef}
          onChange={handlePhotoSelect}
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          className="w-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: photoFile ? 'var(--t-accent-primary-muted)' : 'var(--t-surface-elevated)',
            color: photoFile ? 'var(--t-text-accent)' : 'var(--t-text-muted)',
          }}
          title="Додати фото"
        >
          <Paperclip className="w-4 h-4" />
        </button>

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
