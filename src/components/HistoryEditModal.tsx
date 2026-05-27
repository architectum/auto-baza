import React, { useState, useRef } from 'react';
import { X, Trash2, Activity, Paperclip, ImageIcon } from './Icons';
import { HistoryEntry } from '../types';
import { ImagePreview } from './ImagePreview';

const TYPE_LABELS: Record<string, string> = {
  problem: 'Проблема',
  solution: 'Рішення',
  note: 'Нотатка',
  mileage: 'Пробіг',
};

interface Props {
  entry: HistoryEntry;
  onSave: (updated: Partial<HistoryEntry>, newPhotoFiles?: File[], remainingFiles?: { url: string; path: string }[]) => void;
  onDelete: () => void;
  onClose: () => void;
}

const formatToLocalDateTimeString = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
};

const isImageFile = (pathOrUrl: string) => {
  const cleanPath = pathOrUrl.toLowerCase().split('?')[0];
  return cleanPath.endsWith('.jpg') || 
         cleanPath.endsWith('.jpeg') || 
         cleanPath.endsWith('.png') || 
         cleanPath.endsWith('.gif') || 
         cleanPath.endsWith('.webp') ||
         pathOrUrl.includes('image') ||
         !cleanPath.includes('.');
};

const getFileName = (path: string) => {
  if (!path) return 'Файл';
  const parts = path.split('/');
  return parts[parts.length - 1].replace(/^\d+_/, '');
};

export function HistoryEditModal({ entry, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState(entry.type);
  const [text, setText] = useState(entry.text || '');
  const [cost, setCost] = useState(entry.cost !== undefined ? String(entry.cost) : '');
  const [spentHours, setSpentHours] = useState(entry.spentHours !== undefined ? String(entry.spentHours) : '');
  const [difficulty, setDifficulty] = useState(entry.difficulty !== undefined ? entry.difficulty : 1);
  const [createdAt, setCreatedAt] = useState(formatToLocalDateTimeString(entry.createdAt));
  const isMileage = entry.type === 'mileage';
  
  const [existingFiles, setExistingFiles] = useState<{ url: string; path: string; name?: string }[]>(() => {
    if (entry.fileUrls && entry.filePaths) {
      return entry.fileUrls.map((url, i) => {
        const path = entry.filePaths![i];
        const name = getFileName(path);
        return { url, path, name };
      });
    } else if (entry.photoUrl && entry.photoPath) {
      const name = getFileName(entry.photoPath);
      return [{ url: entry.photoUrl, path: entry.photoPath, name }];
    }
    return [];
  });

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const selectedFiles = Array.from(files);
    setNewFiles(prev => [...prev, ...selectedFiles]);
    
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewFilePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setNewFilePreviews(prev => [...prev, '']);
      }
    });
    
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

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

            {type === 'solution' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Вартість (грн)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cost}
                      onChange={e => setCost(e.target.value)}
                      placeholder="Вартість рішення"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl pl-3.5 pr-12 py-3 text-base font-medium border outline-none t-focus"
                      style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>
                      ₴
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Витрачений час (годин)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={spentHours}
                      onChange={e => setSpentHours(e.target.value)}
                      placeholder="Витрачений час рішення"
                      min="0"
                      step="0.1"
                      className="w-full rounded-xl pl-3.5 pr-12 py-3 text-base font-medium border outline-none t-focus"
                      style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>
                      год
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Складність</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level)}
                          className="w-9 h-9 rounded-lg text-sm font-bold transition-all active:scale-90"
                          style={{
                            background: difficulty >= level
                              ? `color-mix(in srgb, #f97316 ${20 + level * 16}%, transparent)`
                              : 'var(--t-surface-elevated)',
                            color: difficulty >= level ? '#f97316' : 'var(--t-text-muted)',
                            border: difficulty >= level ? '1px solid color-mix(in srgb, #f97316 30%, transparent)' : '1px solid transparent',
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Дата та час запису</label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={e => setCreatedAt(e.target.value)}
                className="w-full rounded-xl px-3.5 py-3 text-base font-medium border outline-none t-focus"
                style={{ background: 'var(--t-surface-input)', color: 'var(--t-text-primary)', borderColor: 'var(--t-border-default)' }}
              />
            </div>

            {/* Files section */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>
                Прикріплені файли (опціонально)
              </label>
              
              {(existingFiles.length > 0 || newFiles.length > 0) && (
                <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
                  {/* Existing Files */}
                  {existingFiles.map((file, idx) => {
                    const isImg = isImageFile(file.path || file.url);
                    return (
                      <div 
                        key={`existing-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImg ? (
                            <img 
                              src={file.url} 
                              alt={file.name} 
                              className="w-10 h-10 object-cover rounded-lg cursor-pointer shrink-0" 
                              onClick={() => setPreviewUrl(file.url)}
                            />
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
                          onClick={() => handleRemoveExistingFile(idx)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                          style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                          title="Видалити"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {/* New Files */}
                  {newFiles.map((file, idx) => {
                    const isImg = file.type.startsWith('image/');
                    const preview = newFilePreviews[idx];
                    return (
                      <div 
                        key={`new-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{ borderColor: 'var(--t-accent-primary-muted)', background: 'var(--t-surface-elevated)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImg && preview ? (
                            <img 
                              src={preview} 
                              alt={file.name} 
                              className="w-10 h-10 object-cover rounded-lg cursor-pointer shrink-0" 
                              onClick={() => setPreviewUrl(preview)}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-default)' }}>
                              <Paperclip className="w-5 h-5 text-muted" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--t-text-primary)' }}>
                              {file.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-accent" style={{ color: 'var(--t-text-accent)' }}>
                              новий
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveNewFile(idx)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                          style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                          title="Видалити"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95"
                style={{ background: 'var(--t-surface-elevated)', borderColor: 'var(--t-border-default)', color: 'var(--t-text-muted)' }}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-sm font-medium">Прикріпити ще файли</span>
              </button>
              
              <input
                type="file"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
                className="hidden"
                ref={photoInputRef}
                onChange={handlePhotoSelect}
              />
            </div>

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
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 shrink-0"
            style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
          >
            <Trash2 className="w-4 h-4" /> Видалити
          </button>
          {!isMileage && (
            <button onClick={() => {
              const updates: Partial<HistoryEntry> = { type, text };
              if (type === 'solution') {
                updates.cost = cost ? Number(cost) : undefined;
                updates.spentHours = spentHours ? Number(spentHours) : undefined;
                updates.difficulty = difficulty;
              } else {
                updates.cost = undefined;
                updates.spentHours = undefined;
                updates.difficulty = undefined;
              }
              if (createdAt) {
                updates.createdAt = new Date(createdAt).toISOString();
              }
              onSave(updates, newFiles.length > 0 ? newFiles : undefined, existingFiles);
            }}
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

      {previewUrl && (
        <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
}
