import React, { useState, useEffect } from 'react';
import { HistoryEntry } from '@types';
import { Trash2 } from '@shared/icons/Icons';
import { getFileName } from '@shared/lib/fileUtils';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Textarea } from '@shared/ui/Textarea';
import { DifficultySelector } from './DifficultySelector';
import { FileAttachments } from './FileAttachments';
import { suggestCost, analyzeDamagePhoto } from '@services/ai';
import { useDebounce } from '@shared/hooks';

const TYPE_LABELS: Record<string, string> = {
  problem: 'Проблема',
  solution: 'Рішення',
  note: 'Нотатка',
  reminder: 'Нагадування',
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatToLocalDateTimeString = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
};

interface EditEntryFormProps {
  entry: HistoryEntry;
  onSave: (updated: Partial<HistoryEntry>, newPhotoFiles?: File[], remainingFiles?: { url: string; path: string }[]) => void;
  onDelete: () => void;
  onPreviewUrl: (url: string) => void;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  history?: HistoryEntry[];
}

export function EditEntryForm({ 
  entry, 
  onSave, 
  onDelete, 
  onPreviewUrl,
  carMake,
  carModel,
  carYear,
  history
}: EditEntryFormProps) {
  const [type, setType] = useState<'note' | 'problem' | 'solution'>(
    (entry.type === 'mileage' || entry.type === 'reminder' ? 'note' : entry.type) as 'note' | 'problem' | 'solution'
  );
  const [text, setText] = useState(entry.text || '');
  const [cost, setCost] = useState(entry.cost !== undefined ? String(entry.cost) : '');
  const [spentHours, setSpentHours] = useState(entry.spentHours !== undefined ? String(entry.spentHours) : '');
  const [difficulty, setDifficulty] = useState(entry.difficulty !== undefined ? entry.difficulty : 1);
  const [createdAt, setCreatedAt] = useState(formatToLocalDateTimeString(entry.createdAt));

  // AI Cost Suggestion (Step 16 - 3.7.2)
  const debouncedText = useDebounce(text, 1200);
  const [suggestedCost, setSuggestedCost] = useState<number | null>(null);
  const [costReasoning, setCostReasoning] = useState<string>('');
  const [loadingCost, setLoadingCost] = useState(false);

  useEffect(() => {
    if (type !== 'solution' || !debouncedText || debouncedText.trim().length < 4) {
      setSuggestedCost(null);
      setCostReasoning('');
      return;
    }

    const fetchCostSuggestion = async () => {
      setLoadingCost(true);
      try {
        const res = await suggestCost(
          debouncedText,
          carMake || '',
          history || []
        );
        if (res.data && res.data.suggestedCost > 0) {
          setSuggestedCost(res.data.suggestedCost);
          setCostReasoning(res.data.reasoning);
        } else {
          setSuggestedCost(null);
        }
      } catch (err) {
        console.error("Failed to fetch cost suggestion in edit form:", err);
      } finally {
        setLoadingCost(false);
      }
    };

    fetchCostSuggestion();
  }, [debouncedText, type, carMake, history]);

  // AI Damage Photo Analysis (Step 17 - 3.7.3)
  const [analyses, setAnalyses] = useState<Record<string, { description: string; severity: 'minor' | 'moderate' | 'severe'; estimatedParts: string[]; loading?: boolean }>>({});

  const handleAnalyzePhoto = async (photoKey: string, base64: string, mimeType: string) => {
    setAnalyses(prev => ({
      ...prev,
      [photoKey]: { description: '', severity: 'minor', estimatedParts: [], loading: true }
    }));

    try {
      const res = await analyzeDamagePhoto(base64, mimeType, carMake, carModel);
      if (res.data) {
        setAnalyses(prev => ({
          ...prev,
          [photoKey]: {
            description: res.data.description,
            severity: res.data.severity,
            estimatedParts: res.data.estimatedParts,
            loading: false
          }
        }));
      } else {
        throw new Error(res.error?.message || "Невідома помилка");
      }
    } catch (err) {
      console.error("Failed to analyze damage photo:", err);
      setAnalyses(prev => ({
        ...prev,
        [photoKey]: {
          description: "Помилка аналізу: не вдалося з'єднатися з AI.",
          severity: 'minor',
          estimatedParts: [],
          loading: false
        }
      }));
    }
  };

  const handleApplyDescription = (appliedText: string) => {
    setText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return appliedText;
      return `${trimmed}\n\nОпис пошкодження від AI:\n${appliedText}`;
    });
  };

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

  const handleAddFiles = (files: File[]) => {
    setNewFiles(prev => [...prev, ...files]);
    files.forEach(file => {
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
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updates: Partial<HistoryEntry> = { type, text };
    if (type === 'solution') {
      updates.cost = cost ? Number(cost) : undefined;
      updates.spentHours = spentHours ? Number(spentHours) : undefined;
      updates.difficulty = difficulty;
      
      updates.reminderDate = undefined;
      updates.reminderTime = undefined;
      updates.reminderStatus = undefined;
      updates.reminderRecurrence = undefined;
    } else {
      updates.cost = undefined;
      updates.spentHours = undefined;
      updates.difficulty = undefined;
      updates.reminderDate = undefined;
      updates.reminderTime = undefined;
      updates.reminderStatus = undefined;
      updates.reminderRecurrence = undefined;
    }
    if (createdAt) {
      updates.createdAt = new Date(createdAt).toISOString();
    }
    onSave(updates, newFiles.length > 0 ? newFiles : undefined, existingFiles);
  };

  return (
    <>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Тип запису</label>
      <div className="flex gap-2 mb-4">
        {(['note', 'problem', 'solution'] as const).map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: type === t ? 'var(--t-accent-primary)' : 'var(--t-surface-elevated)',
              color: type === t ? 'var(--t-text-on-accent)' : 'var(--t-text-secondary)',
            }}
          >{TYPE_LABELS[t]}</button>
        ))}
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>Текст</label>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        minRows={3}
        className="mb-4"
        enableVoice
        voiceContext="text"
        onVoiceInput={transcribed => setText(prev => prev ? `${prev.trim()}\n${transcribed}` : transcribed)}
      />

      {type === 'solution' && (
        <>
          <div className="mb-4">
            <Input
              label="Вартість (грн)"
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="Вартість рішення"
              min={0}
              step={0.01}
              suffix={<span className="text-sm font-bold">₴</span>}
            />
            {loadingCost && (
              <div className="text-xs text-muted flex items-center gap-1.5 mt-1.5 px-1 animate-pulse" style={{ color: 'var(--t-text-muted)' }}>
                <svg className="w-3.5 h-3.5 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                </svg>
                Оцінюємо вартість роботи...
              </div>
            )}
            {!loadingCost && suggestedCost !== null && suggestedCost > 0 && (
              <div className="text-xs mt-1.5 px-1 flex flex-wrap items-center justify-between gap-2" style={{ color: 'var(--t-text-secondary)' }}>
                <span title={costReasoning} className="cursor-help flex items-center gap-1">
                  💡 Рекомендовано: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{suggestedCost} грн</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setCost(String(suggestedCost)); }}
                  className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95 transition-all cursor-pointer"
                >
                  Заповнити
                </button>
              </div>
            )}
          </div>
          <div className="mb-4">
            <Input
              label="Витрачений час (годин)"
              type="number"
              value={spentHours}
              onChange={e => setSpentHours(e.target.value)}
              placeholder="Витрачений час рішення"
              min={0}
              step={0.1}
              suffix={<span className="text-sm font-bold">год</span>}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Складність</label>
              <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
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

      <FileAttachments
        existingFiles={existingFiles}
        newFiles={newFiles}
        newFilePreviews={newFilePreviews}
        onRemoveExistingFile={handleRemoveExistingFile}
        onRemoveNewFile={handleRemoveNewFile}
        onAddFiles={handleAddFiles}
        onPreviewUrl={onPreviewUrl}
        carMake={carMake}
        carModel={carModel}
        analyses={analyses}
        onAnalyzePhoto={handleAnalyzePhoto}
        onApplyDescription={handleApplyDescription}
      />

      <div className="flex gap-3 mt-6">
        <Button
          variant="danger"
          size="md"
          onClick={onDelete}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Видалити
        </Button>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={handleSave}
          className="t-accent-gradient"
        >
          Зберегти
        </Button>
      </div>
    </>
  );
}
