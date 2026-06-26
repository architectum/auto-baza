import { useState, useRef, useEffect } from 'react';
import { HistoryEntry } from '@types';
import { Activity, CalendarDays, MessageSquare, ShieldAlert, Trash2 } from '@shared/icons/Icons';
import { HistoryEditModal } from './HistoryEditModal';
import { TextHistoryInput } from './TextHistoryInput';
import { ImagePreview } from '@shared/ui/ImagePreview';
import { useDialog } from '@shared/context/DialogContext';

import { HistoryItem } from './components/HistoryItem';
import { LinkLines } from './components/LinkLines';


interface Props {
  history: HistoryEntry[];
  currentMileage: number;
  onCreateHistory: (data: Partial<HistoryEntry>, photoFiles?: File[] | File) => Promise<string | undefined> | any;
  onUpdateHistory: (id: string, data: Partial<HistoryEntry>, newPhotoFiles?: File[], remainingFiles?: { url: string; path: string }[]) => void;
  onDeleteHistory: (id: string) => void;
  onMileageRequired?: () => void;
  carMake?: string;
  carModel?: string;
  carYear?: number;
}

export function ServiceHistory({ 
  history, 
  currentMileage, 
  onCreateHistory, 
  onUpdateHistory, 
  onDeleteHistory, 
  onMileageRequired,
  carMake,
  carModel,
  carYear
}: Props) {
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { prompt } = useDialog();

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
  const canEditEntry = (entry: HistoryEntry): boolean => {
    if (entry.type !== 'mileage') return true;
    const idx = history.findIndex(e => e.id === entry.id);
    if (idx <= 0) return true;
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

  const handleCreateSolutionFromSuggestion = async (suggestionText: string, problemId: string) => {
    try {
      const solutionId = await onCreateHistory({
        type: 'solution',
        text: suggestionText,
        createdAt: new Date().toISOString()
      });
      
      if (solutionId) {
        await onUpdateHistory(problemId, { linkedSolutionId: solutionId });
        showToast("Створено рішення та пов'язано з проблемою");
      }
    } catch (err) {
      console.error("Failed to create solution from suggestion:", err);
    }
  };

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
          onClick={async () => {
            const v = await prompt('Введіть новий пробіг (км):', currentMileage ? String(currentMileage) : '');
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
          onSubmit={d => onCreateHistory({ type: d.type as any, text: d.text, cost: d.cost, spentHours: d.spentHours, difficulty: d.difficulty }, d.photoFiles)}
          disabled={!hasMileage}
          onDisabledClick={() => showToast('Спочатку додайте пробіг')}
        />
      </div>

      <div className="space-y-3 relative pl-14" ref={historyContainerRef}>
        {/* SVG Lines Overlay */}
        <LinkLines
          links={links}
          itemCoords={itemCoords}
          linkLanes={linkLanes}
          selectedEntryId={selectedEntryId}
          linkingModeActive={linkingMode.active}
          onDeleteLinkClick={setLinkToDelete}
        />

        {history.map(entry => {
          const dimmed = isDimmed(entry);
          const highlighted = isHighlighted(entry);

          return (
            <HistoryItem
              key={entry.id}
              entry={entry}
              carMake={carMake}
              carModel={carModel}
              carYear={carYear}
              canEditEntry={canEditEntry}
              onEditClick={setEditingEntry}
              onPreviewImage={setPreviewUrl}
              dimmed={dimmed}
              highlighted={highlighted}
              onClick={() => {
                if (linkingMode.active) return;
                if (entry.type === 'problem' || entry.type === 'solution') {
                  setSelectedEntryId(entry.id || null);
                }
              }}
              selectedEntryId={selectedEntryId}
              linkingModeActive={linkingMode.active}
              linkingSourceId={linkingMode.sourceId}
              linkingSourceType={linkingMode.sourceType}
              onStartLinking={() => setLinkingMode({ active: true, sourceId: entry.id!, sourceType: entry.type as any })}
              onConfirmLinking={() => {
                if (linkingMode.sourceType === 'problem') {
                  onUpdateHistory(linkingMode.sourceId!, { linkedSolutionId: entry.id! });
                } else {
                  onUpdateHistory(entry.id!, { linkedSolutionId: linkingMode.sourceId! });
                }
                setLinkingMode({ active: false, sourceId: null, sourceType: null });
                setSelectedEntryId(null);
              }}
              onCreateSolutionFromSuggestion={(s) => handleCreateSolutionFromSuggestion(s, entry.id!)}
              onUpdateHistory={onUpdateHistory}
            />
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
          carMake={carMake}
          carModel={carModel}
          carYear={carYear}
          history={history}
          onSave={(updated, newPhotoFiles, remainingFiles) => {
            if (editingEntry.id) onUpdateHistory(editingEntry.id, updated, newPhotoFiles, remainingFiles);
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
