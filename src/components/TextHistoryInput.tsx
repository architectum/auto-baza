import { useState, useRef } from 'react';
import { Send, Paperclip, X } from './Icons';

const TYPE_OPTIONS = [
  { value: 'note', label: 'Нотатка', color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' },
  { value: 'problem', label: 'Проблема', color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' },
  { value: 'solution', label: 'Рішення', color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' },
] as const;

interface Props {
  onSubmit: (data: { type: string; text: string; photoFiles?: File[]; cost?: number; spentHours?: number; createdAt?: string }) => void;
  /** When true, the input is blocked (mileage must be added first) */
  disabled?: boolean;
  /** Called when user clicks the button while disabled */
  onDisabledClick?: () => void;
}

export function TextHistoryInput({ onSubmit, disabled, onDisabledClick }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<string>('note');
  const [cost, setCost] = useState('');
  const [spentHours, setSpentHours] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      type,
      text: text.trim(),
      photoFiles: photoFiles.length > 0 ? photoFiles : undefined,
      cost: type === 'solution' && cost ? Number(cost) : undefined,
      spentHours: type === 'solution' && spentHours ? Number(spentHours) : undefined,
      createdAt: new Date().toISOString(),
    });
    setText('');
    setCost('');
    setSpentHours('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setExpanded(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const selectedFiles = Array.from(files);
    setPhotoFiles(prev => [...prev, ...selectedFiles]);
    
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPhotoPreviews(prev => [...prev, '']);
      }
    });
    
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
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
        placeholder="Введіть text запису..."
        autoFocus
        className="w-full rounded-xl px-3.5 py-3 text-sm font-medium border outline-none t-focus resize-none mb-3"
        style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)', minHeight: '5rem' }}
      />

      {type === 'solution' && (
        <>
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
          <div className="mb-3 relative">
            <input
              type="number"
              value={spentHours}
              onChange={e => setSpentHours(e.target.value)}
              placeholder="Витрачений час на рішення (год)"
              min="0"
              step="0.1"
              className="w-full rounded-xl pl-3.5 pr-12 py-3 text-sm font-medium border outline-none t-focus"
              style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>
              год
            </span>
          </div>
        </>
      )}

      {/* Photo and file previews */}
      {photoFiles.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {photoFiles.map((file, index) => {
            const preview = photoPreviews[index];
            const isImg = file.type.startsWith('image/');
            return (
              <div 
                key={index} 
                className="flex items-center justify-between p-2.5 rounded-xl border animate-fade-in"
                style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isImg && preview ? (
                    <img src={preview} alt={file.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-default)' }}>
                      <Paperclip className="w-5 h-5 text-muted" />
                    </div>
                  )}
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--t-text-secondary)' }}>
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => removePhoto(index)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                  style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setExpanded(false); setText(''); setCost(''); setSpentHours(''); setPhotoFiles([]); setPhotoPreviews([]); }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
        >Скасувати</button>

        {/* Photo attach button */}
        <input
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          className="hidden"
          ref={photoInputRef}
          onChange={handlePhotoSelect}
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          className="w-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: photoFiles.length > 0 ? 'var(--t-accent-primary-muted)' : 'var(--t-surface-elevated)',
            color: photoFiles.length > 0 ? 'var(--t-text-accent)' : 'var(--t-text-muted)',
          }}
          title="Додати фото або файли"
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
