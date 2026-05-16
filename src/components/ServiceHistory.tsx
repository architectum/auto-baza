import { useState, useRef, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { AlertCircle, Wrench, Info, Activity, CalendarDays, MessageSquare, Edit2, Trash2, ShieldAlert, Link2, Lock, ImageIcon } from './Icons';
import { HistoryEditModal } from './HistoryEditModal';
import { TextHistoryInput } from './TextHistoryInput';
import { VoiceAssistant } from './VoiceAssistant';
import { ImagePreview } from './ImagePreview';

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
  onCreateHistory: (data: Partial<HistoryEntry>, photoFile?: File) => void;
  onUpdateHistory: (id: string, data: Partial<HistoryEntry>, photoFile?: File) => void;
  onDeleteHistory: (id: string) => void;
  /** Called when user tries to add voice/text but mileage is required first */
  onMileageRequired?: () => void;
}

export function ServiceHistory({ history, currentMileage, onCreateHistory, onUpdateHistory, onDeleteHistory, onMileageRequired }: Props) {
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Linking state
  const [linkingMode, setLinkingMode] = useState<{ active: boolean; sourceId: string | null; sourceType: 'problem' | 'solution' | null }>({ active: false, sourceId: null, sourceType: null });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<{ problemId: string, solutionId: string } | null>(null);

  const historyContainerRef = useRef<HTMLDivElement>(null);
  const [itemCoords, setItemCoords] = useState<Record<string, { x: number, y: number, height: number, markerX: number }>>({});

  useEffect(() => {
    const updateCoords = () => {
      if (!historyContainerRef.current) return;
      const containerRect = historyContainerRef.current.getBoundingClientRect();
      const nodes = historyContainerRef.current.querySelectorAll('[data-history-id]');
      const newCoords: Record<string, { x: number, y: number, height: number, markerX: number }> = {};
      nodes.forEach(node => {
        const id = node.getAttribute('data-history-id');
        if (id) {
          const rect = node.getBoundingClientRect();
          const marker = node.querySelector('[data-history-marker]');
          const markerRect = marker instanceof Element ? marker.getBoundingClientRect() : undefined;
          newCoords[id] = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            height: rect.height,
            markerX: markerRect ? markerRect.left - containerRect.left + markerRect.width / 2 : rect.left - containerRect.left + 20,
          };
        }
      });
      setItemCoords(newCoords);
    };

    updateCoords();
    if (historyContainerRef.current) {
      const observer = new ResizeObserver(updateCoords);
      observer.observe(historyContainerRef.current);
      return () => observer.disconnect();
    }
  }, [history, linkingMode, selectedEntryId]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setSelectedEntryId(null);
      setLinkingMode({ active: false, sourceId: null, sourceType: null });
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Check if any mileage entry exists in the history
  const hasMileage = history.some(e => e.type === 'mileage');

  // Determine if a given entry can be edited or deleted.
  // A mileage entry can only be edited/deleted if there are no entries
  // above it (i.e., newer entries created after it) in the history.
  // History is sorted desc (newest first), so entries "above" = lower index.
  const canEditEntry = (entry: HistoryEntry): boolean => {
    if (entry.type !== 'mileage') return true;
    const idx = history.findIndex(e => e.id === entry.id);
    // If this mileage entry is at index 0 (top), there's nothing above it
    if (idx <= 0) return true;
    // Check if any entries above (index < idx) exist
    return false;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isDimmed = (entry: HistoryEntry) => {
    if (!linkingMode.active) return false;
    if (entry.id === linkingMode.sourceId) return false;
    if (linkingMode.sourceType === 'problem') {
      if (entry.type !== 'solution') return true;
      return false;
    }
    if (linkingMode.sourceType === 'solution') {
      if (entry.type !== 'problem') return true;
      if (entry.linkedSolutionId && entry.linkedSolutionId !== linkingMode.sourceId) return true;
      return false;
    }
    return true;
  };

  const isHighlighted = (entry: HistoryEntry) => {
    if (selectedEntryId === entry.id) return true;
    const selectedEntry = history.find(e => e.id === selectedEntryId);
    if (selectedEntry) {
      if (selectedEntry.type === 'problem' && entry.id === selectedEntry.linkedSolutionId) return true;
      if (selectedEntry.type === 'solution' && entry.type === 'problem' && entry.linkedSolutionId === selectedEntry.id) return true;
    }
    return false;
  };

  const links = history.filter(e => e.type === 'problem' && e.linkedSolutionId).map(p => ({
    problemId: p.id!,
    solutionId: p.linkedSolutionId!
  }));

  const linkLanes = links.reduce<Record<string, number>>((acc, link, index) => {
    const pCoords = itemCoords[link.problemId];
    const sCoords = itemCoords[link.solutionId];
    if (!pCoords || !sCoords) return acc;
    const y1 = pCoords.y + pCoords.height / 2;
    const y2 = sCoords.y + sCoords.height / 2;
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const occupied = new Set<number>();

    links.slice(0, index).forEach(other => {
      const op = itemCoords[other.problemId];
      const os = itemCoords[other.solutionId];
      if (!op || !os) return;
      const oy1 = op.y + op.height / 2;
      const oy2 = os.y + os.height / 2;
      const otherTop = Math.min(oy1, oy2);
      const otherBottom = Math.max(oy1, oy2);
      if (Math.max(top, otherTop) < Math.min(bottom, otherBottom) + 12) {
        occupied.add(acc[`${other.problemId}-${other.solutionId}`] || 0);
      }
    });

    let lane = 0;
    while (occupied.has(lane)) lane += 1;
    acc[`${link.problemId}-${link.solutionId}`] = lane;
    return acc;
  }, {});

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
        <TextHistoryInput
          onSubmit={d => onCreateHistory({ type: d.type as any, text: d.text }, d.photoFile)}
          disabled={!hasMileage}
          onDisabledClick={() => showToast('Спочатку додайте пробіг')}
        />
      </div>

      <div className="space-y-3 relative pl-14" ref={historyContainerRef}>
        {/* SVG Lines Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {links.map(link => {
            const pCoords = itemCoords[link.problemId];
            const sCoords = itemCoords[link.solutionId];
            if (!pCoords || !sCoords) return null;

            const lane = linkLanes[`${link.problemId}-${link.solutionId}`] || 0;
            const x = Math.max(8, 24 - lane * 8);
            const y1 = pCoords.y + pCoords.height / 2;
            const y2 = sCoords.y + sCoords.height / 2;

            const isSelected = selectedEntryId === link.problemId || selectedEntryId === link.solutionId;

            return (
              <g key={`${link.problemId}-${link.solutionId}`}
                style={{ pointerEvents: isSelected ? 'auto' : 'none', opacity: (linkingMode.active || (!isSelected && selectedEntryId)) ? 0.2 : 1 }}
              >
                <path
                  d={`M ${pCoords.markerX - 22} ${y1} L ${x} ${y1} L ${x} ${y2} L ${sCoords.markerX - 22} ${y2}`}
                  fill="none"
                  stroke="var(--t-border-accent)"
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                  className="history-link-path"
                  style={{ strokeDasharray: isSelected ? 'none' : '6 4' }}
                />
                {isSelected && (
                  <foreignObject x={x - 15} y={(y1 + y2) / 2 - 15} width={30} height={30}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLinkToDelete(link); }}
                      className="w-full h-full rounded-full flex items-center justify-center text-white active:scale-95 border-2"
                      style={{ background: 'var(--t-status-problem)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {history.map(entry => {
          const status = getStatusClasses(entry.type);
          const dimmed = isDimmed(entry);
          const highlighted = isHighlighted(entry);

          return (
            <div
              key={entry.id}
              data-history-id={entry.id}
              onClick={(e) => {
                e.stopPropagation();
                if (linkingMode.active) return;
                if (entry.type === 'problem' || entry.type === 'solution') {
                  setSelectedEntryId(entry.id || null);
                }
              }}
              className={`relative history-item-transition ${dimmed ? 'history-item-dimmed' : ''
                } ${highlighted ? 'z-10' : ''
                }`}
            >
              {/* Link Buttons overlay */}
              {selectedEntryId === entry.id && !linkingMode.active && (entry.type === 'problem' && !entry.linkedSolutionId || entry.type === 'solution') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLinkingMode({ active: true, sourceId: entry.id!, sourceType: entry.type as any }); }}
                  className="absolute -left-12 top-3 w-8 h-8 rounded-full flex items-center justify-center border active:scale-95 z-20"
                  title="Створити зв'язок"
                  style={{ color: 'var(--t-text-accent)', background: 'var(--t-surface-card)', borderColor: 'var(--t-border-accent)' }}
                >
                  <Link2 className="w-4 h-4" />
                </button>
              )}
              {linkingMode.active && !dimmed && entry.id !== linkingMode.sourceId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkingMode.sourceType === 'problem') {
                      onUpdateHistory(linkingMode.sourceId!, { linkedSolutionId: entry.id! });
                    } else {
                      onUpdateHistory(entry.id!, { linkedSolutionId: linkingMode.sourceId! });
                    }
                    setLinkingMode({ active: false, sourceId: null, sourceType: null });
                    setSelectedEntryId(null);
                  }}
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
                  ['--history-accent' as string]: status.color,
                  ['--history-accent-bg' as string]: status.bg,
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
                      <button onClick={() => setEditingEntry(entry)} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 shrink-0 mt-0.5"
                        style={{ color: 'var(--t-text-muted)' }} title="Редагувати">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {entry.text && <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>{entry.text}</p>}
                  
                  {/* Photo thumbnail */}
                  {entry.photoUrl && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(entry.photoUrl!); }}
                        className="relative rounded-lg overflow-hidden border transition-all active:scale-95 group"
                        style={{ borderColor: 'var(--t-border-default)' }}
                      >
                        <img
                          src={entry.photoUrl}
                          alt="Фото"
                          className="w-20 h-20 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                      </button>
                    </div>
                  )}

                  {(entry.runtimeMileage || entry.mileageDiff > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
                      {entry.runtimeMileage ? <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>{entry.runtimeMileage.toLocaleString()} км</span> : null}
                      {entry.mileageDiff > 0 ? <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--t-status-solution)' }}>▲ +{entry.mileageDiff.toLocaleString()} км</span> : null}
                    </div>
                  )}
                </div>
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
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Спочатку додайте пробіг, потім можна вносити записи</p>
          </div>
        )}
      </div>

      {editingEntry && (
        <HistoryEditModal
          entry={editingEntry}
          onSave={(updated, newPhotoFile) => {
            if (editingEntry.id) onUpdateHistory(editingEntry.id, updated, newPhotoFile);
            setEditingEntry(null);
          }}
          onDelete={() => {
            if (editingEntry.id) onDeleteHistory(editingEntry.id);
            setEditingEntry(null);
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {linkToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass animate-fade-in"
          onClick={() => setLinkToDelete(null)}>
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl animate-scale-in"
            style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--t-text-primary)' }}>Видалити зв'язок?</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--t-text-secondary)' }}>
              Ви впевнені, що хочете розірвати зв'язок між цією проблемою та рішенням? Самі записи не будуть видалені.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setLinkToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95"
                style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>Скасувати</button>
              <button onClick={() => {
                onUpdateHistory(linkToDelete.problemId, { linkedSolutionId: '' });
                setLinkToDelete(null);
                setSelectedEntryId(null);
              }}
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg"
                style={{ background: 'var(--t-status-problem)' }}>Так, видалити</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewUrl && (
        <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-xl"
            style={{
              background: 'var(--t-surface-card)',
              borderColor: 'color-mix(in srgb, var(--t-status-problem) 40%, var(--t-border-default))',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3)',
            }}
          >
            <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: 'var(--t-status-problem)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--t-text-primary)' }}>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
