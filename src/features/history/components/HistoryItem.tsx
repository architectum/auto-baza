import React, { useState } from 'react';
import { HistoryEntry } from '@types';
import { AlertCircle, Wrench, Info, Activity, Edit2, Link2, Lock, ImageIcon, Paperclip, Banknote, Clock, Target, Sparkles, ReminderIcon } from '@shared/icons/Icons';
import { isImageFile, getFileName } from '@shared/lib/fileUtils';
import { getRepairSuggestions } from '@services/ai';

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function StatusIcon({ type }: { type: string }) {
  const c = "w-5 h-5";
  if (type === 'problem') return <AlertCircle className={c} />;
  if (type === 'solution') return <Wrench className={c} />;
  if (type === 'mileage') return <Activity className={c} />;
  if (type === 'reminder') return <ReminderIcon className={c} />;
  return <Info className={c} />;
}

function getStatusClasses(type: string) {
  switch (type) {
    case 'problem': return { color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' };
    case 'solution': return { color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' };
    case 'mileage': return { color: 'var(--t-status-mileage)', bg: 'var(--t-status-mileage-bg)' };
    case 'reminder': return { color: 'var(--t-status-reminder)', bg: 'var(--t-status-reminder-bg)' };
    default: return { color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' };
  }
}

const TYPE_LABELS: Record<string, string> = { 
  problem: 'проблема', 
  solution: 'рішення', 
  note: 'нотатка', 
  mileage: 'пробіг',
  reminder: 'нагадування'
};



interface HistoryItemProps {
  entry: HistoryEntry;
  canEditEntry: (entry: HistoryEntry) => boolean;
  onEditClick: (entry: HistoryEntry) => void;
  onPreviewImage: (url: string) => void;
  dimmed: boolean;
  highlighted: boolean;
  onClick: () => void;
  selectedEntryId: string | null;
  linkingModeActive: boolean;
  linkingSourceId: string | null;
  linkingSourceType: 'problem' | 'solution' | null;
  onStartLinking: () => void;
  onConfirmLinking: () => void;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  onCreateSolutionFromSuggestion?: (suggestionText: string) => void;
  onUpdateHistory?: (id: string, data: Partial<HistoryEntry>) => void;
}

export function HistoryItem({
  entry,
  canEditEntry,
  onEditClick,
  onPreviewImage,
  dimmed,
  highlighted,
  onClick,
  selectedEntryId,
  linkingModeActive,
  linkingSourceId,
  linkingSourceType,
  onStartLinking,
  onConfirmLinking,
  carMake,
  carModel,
  carYear,
  onCreateSolutionFromSuggestion,
  onUpdateHistory,
}: HistoryItemProps) {
  const status = getStatusClasses(entry.type);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleToggleSuggestions = async () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    if (suggestions.length === 0) {
      setLoadingSuggestions(true);
      try {
        const res = await getRepairSuggestions(
          entry.text || '',
          carMake || '',
          carModel || '',
          carYear
        );
        if (res.data) {
          setSuggestions(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch AI suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }
  };

  return (
    <div
      data-history-id={entry.id}
      onClick={onClick}
      className={`relative history-item-transition ${dimmed ? 'history-item-dimmed' : ''} ${highlighted ? 'z-10' : ''}`}
    >
      {/* Link Buttons overlay */}
      {selectedEntryId === entry.id && !linkingModeActive && (entry.type === 'problem' && !entry.linkedSolutionId || entry.type === 'solution') && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartLinking(); }}
          className="absolute -left-12 top-3 w-8 h-8 rounded-full flex items-center justify-center border active:scale-95 z-20"
          title="Створити зв'язок"
          style={{ color: 'var(--t-text-accent)', background: 'var(--t-surface-card)', borderColor: 'var(--t-border-accent)' }}
        >
          <Link2 className="w-4 h-4" />
        </button>
      )}
      {linkingModeActive && !dimmed && entry.id !== linkingSourceId && (
        <button
          onClick={(e) => { e.stopPropagation(); onConfirmLinking(); }}
          className="absolute -left-12 top-3 w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-95 z-20"
          style={{ background: 'var(--t-status-solution)' }}
          title="Поєднати"
        >
          <Lock className="w-4 h-4" />
        </button>
      )}
      <div className={`history-entry-card ${highlighted ? 'history-entry-card-highlighted' : ''}`}
        style={{
          background: 'var(--t-surface-card)',
          borderColor: `color-mix(in srgb, ${status.color} 46%, var(--t-border-default))`,
          ['--history-accent' as any]: status.color,
          ['--history-accent-bg' as any]: status.bg,
        }}
      >
        <div data-history-marker className="history-entry-icon" style={{ background: status.bg, color: status.color }}>
          <StatusIcon type={entry.type} />
        </div>
        <div className="flex-1 min-w-0 p-4 pl-5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="font-bold uppercase tracking-wider text-xs px-2.5 py-1 rounded-full w-fit" style={{ background: status.bg, color: status.color }}>
                {TYPE_LABELS[entry.type] || entry.type}
              </span>
              <time className="text-xs font-mono" style={{ color: 'var(--t-text-muted)' }}>
                {new Date(entry.createdAt).toLocaleDateString()}{' '}
                {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
            {canEditEntry(entry) && (
              <button onClick={(e) => { e.stopPropagation(); onEditClick(entry); }} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 shrink-0 mt-0.5"
                style={{ color: 'var(--t-text-muted)' }} title="Редагувати">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {entry.text && <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>{entry.text}</p>}

          {entry.type === 'reminder' && (
            <div className="mt-2.5 p-3 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold" style={{ color: 'var(--t-text-secondary)' }}>
                  ⏰ Нагадати: <span className="font-mono font-bold">{entry.reminderDate}</span> о <span className="font-mono font-bold">{entry.reminderTime}</span>
                </span>
                {entry.reminderRecurrence && entry.reminderRecurrence !== 'once' && (
                  <span className="px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}>
                    🔄 {entry.reminderRecurrence === 'daily' ? 'Щодня' : entry.reminderRecurrence === 'weekly' ? 'Щотижня' : 'Щомісяця'}
                  </span>
                )}
                {(() => {
                  const status = entry.reminderStatus || 'pending';
                  const label = status === 'sent' ? 'Відправлено' : status === 'dismissed' ? 'Відхилено' : 'Очікує';
                  const bg = status === 'sent' ? 'var(--t-status-solution-bg)' : status === 'dismissed' ? 'var(--t-surface-elevated)' : 'var(--t-status-reminder-bg)';
                  const color = status === 'sent' ? 'var(--t-status-solution)' : status === 'dismissed' ? 'var(--t-text-muted)' : 'var(--t-status-reminder)';
                  const borderColor = status === 'sent' ? 'color-mix(in srgb, var(--t-status-solution) 30%, transparent)' : status === 'dismissed' ? 'var(--t-border-default)' : 'color-mix(in srgb, var(--t-status-reminder) 30%, transparent)';
                  return (
                    <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border" style={{ background: bg, color: color, borderColor: borderColor }}>
                      {label}
                    </span>
                  );
                })()}
              </div>
              
              {entry.reminderStatus === 'pending' && onUpdateHistory && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateHistory(entry.id!, { reminderStatus: 'dismissed' });
                    }}
                    className="flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                    style={{
                      background: 'var(--t-surface-card)',
                      borderColor: 'var(--t-border-default)',
                      color: 'var(--t-text-secondary)'
                    }}
                  >
                    Відхилити
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const tomorrow = addDays(entry.reminderDate || new Date().toISOString().split('T')[0], 1);
                      onUpdateHistory(entry.id!, { reminderDate: tomorrow });
                    }}
                    className="flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider border active:scale-95 transition-all cursor-pointer"
                    style={{
                      background: 'var(--t-status-reminder-bg)',
                      borderColor: 'color-mix(in srgb, var(--t-status-reminder) 20%, transparent)',
                      color: 'var(--t-status-reminder)'
                    }}
                  >
                    Відкласти на 1 день
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Repair Suggestions (Step 15 - 3.7.1) */}
          {entry.type === 'problem' && !entry.linkedSolutionId && (
            <div className="mt-2.5">
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleSuggestions(); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.96] border cursor-pointer"
                style={{
                  background: 'var(--t-accent-primary-muted)',
                  color: 'var(--t-text-accent)',
                  borderColor: 'var(--t-border-accent)'
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                💡 Підказки AI
              </button>

              {showSuggestions && (
                <div 
                  onClick={e => e.stopPropagation()}
                  className="mt-3 p-3.5 rounded-2xl border space-y-2.5 animate-fade-in" 
                  style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}
                >
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--t-text-muted)' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--t-accent-primary)' }} />
                    Рекомендовані рішення від AI
                  </div>
                  
                  {loadingSuggestions ? (
                    <div className="flex items-center gap-2 py-1.5 text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                      <svg className="w-4 h-4 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                      </svg>
                      Аналізуємо проблему автомайстром...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map((s, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all"
                        >
                          <span className="text-xs font-medium leading-relaxed flex-1" style={{ color: 'var(--t-text-primary)' }}>
                            {s}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateSolutionFromSuggestion?.(s);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg text-white bg-emerald-600 active:scale-95 transition-all shrink-0 cursor-pointer"
                          >
                            Створити рішення
                          </button>
                        </div>
                      ))}
                      {suggestions.length === 0 && (
                        <div className="text-xs py-1" style={{ color: 'var(--t-text-muted)' }}>
                          Не вдалося згенерувати підказки для цієї проблеми.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Attached files/images */}
          {(() => {
            const filesToShow = entry.fileUrls && entry.fileUrls.length > 0 
              ? entry.fileUrls.map((url, i) => ({ url, path: entry.filePaths?.[i] || '' }))
              : entry.photoUrl 
                ? [{ url: entry.photoUrl, path: entry.photoPath || '' }] 
                : [];
                
            if (filesToShow.length === 0) return null;
            
            return (
              <div className="mt-3 flex flex-wrap gap-2">
                {filesToShow.map((file, idx) => {
                  const isImg = isImageFile(file.path || file.url);
                  const fileName = getFileName(file.path);
                  
                  if (isImg) {
                    return (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); onPreviewImage(file.url); }}
                        className="relative rounded-lg overflow-hidden border transition-all active:scale-95 group shrink-0"
                        style={{ borderColor: 'var(--t-border-default)' }}
                      >
                        <img
                          src={file.url}
                          alt={fileName}
                          className="w-16 h-16 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <ImageIcon className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    );
                  } else {
                    return (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 active:scale-95 transition-all shrink-0 max-w-[15rem]"
                        style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
                        title={fileName}
                      >
                        <Paperclip className="w-4 h-4 shrink-0 text-muted" />
                        <span className="truncate flex-1">{fileName}</span>
                      </a>
                    );
                  }
                })}
              </div>
            );
          })()}

          {(entry.runtimeMileage || entry.mileageDiff > 0 || (entry.type === 'solution' && (entry.cost !== undefined || entry.spentHours !== undefined))) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
              {entry.runtimeMileage ? <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>{entry.runtimeMileage.toLocaleString()} км</span> : null}
              {entry.mileageDiff > 0 ? <span className="text-xs font-mono font-medium flex items-center gap-1" style={{ color: 'var(--t-status-solution)' }}>▲ +{entry.mileageDiff.toLocaleString()} км</span> : null}
              {entry.type === 'solution' && entry.cost !== undefined && entry.cost > 0 && (
                <span className="text-sm font-bold font-mono px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs transition-transform active:scale-[0.98]" style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #fde047' }}>
                  <Banknote className="w-4 h-4 shrink-0" />
                  {entry.cost.toLocaleString()} грн
                </span>
              )}
              {entry.type === 'solution' && entry.spentHours !== undefined && entry.spentHours > 0 && (
                <span className="text-sm font-bold font-mono px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs transition-transform active:scale-[0.98]" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)', border: '1px solid var(--t-border-default)' }}>
                  <Clock className="w-4 h-4 shrink-0" />
                  {entry.spentHours} год
                </span>
              )}
              {entry.type === 'solution' && entry.difficulty !== undefined && entry.difficulty > 0 && (
                <span className="text-sm font-bold font-mono px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs transition-transform active:scale-[0.98]" style={{ background: `color-mix(in srgb, #f97316 ${10 + entry.difficulty * 6}%, transparent)`, color: '#f97316', border: '1px solid color-mix(in srgb, #f97316 25%, transparent)' }}>
                  <Target className="w-4 h-4 shrink-0" />
                  {entry.difficulty}/5
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
