import React, { useState } from 'react';
import { HistoryEntry } from '@types';
import { Trash2 } from '@shared/icons/Icons';
import { getFileName } from '@shared/lib/fileUtils';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Textarea } from '@shared/ui/Textarea';
import { DifficultySelector } from './DifficultySelector';
import { FileAttachments } from './FileAttachments';

const TYPE_LABELS: Record<string, string> = {
  problem: 'Проблема',
  solution: 'Рішення',
  note: 'Нотатка',
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
}

export function EditEntryForm({ entry, onSave, onDelete, onPreviewUrl }: EditEntryFormProps) {
  const [type, setType] = useState<'note' | 'problem' | 'solution'>(
    (entry.type === 'mileage' ? 'note' : entry.type) as 'note' | 'problem' | 'solution'
  );
  const [text, setText] = useState(entry.text || '');
  const [cost, setCost] = useState(entry.cost !== undefined ? String(entry.cost) : '');
  const [spentHours, setSpentHours] = useState(entry.spentHours !== undefined ? String(entry.spentHours) : '');
  const [difficulty, setDifficulty] = useState(entry.difficulty !== undefined ? entry.difficulty : 1);
  const [createdAt, setCreatedAt] = useState(formatToLocalDateTimeString(entry.createdAt));

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
    } else {
      updates.cost = undefined;
      updates.spentHours = undefined;
      updates.difficulty = undefined;
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
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
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
