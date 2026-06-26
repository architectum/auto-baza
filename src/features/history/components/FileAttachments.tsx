import React, { useRef } from 'react';
import { X, Paperclip } from '@shared/icons/Icons';
import { isImageFile } from '@shared/lib/fileUtils';

interface FileAttachmentsProps {
  existingFiles: { url: string; path: string; name?: string }[];
  newFiles: File[];
  newFilePreviews: string[];
  onRemoveExistingFile: (index: number) => void;
  onRemoveNewFile: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onPreviewUrl: (url: string) => void;
}

export function FileAttachments({
  existingFiles,
  newFiles,
  newFilePreviews,
  onRemoveExistingFile,
  onRemoveNewFile,
  onAddFiles,
  onPreviewUrl,
}: FileAttachmentsProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    onAddFiles(Array.from(files));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  return (
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
                      onClick={() => onPreviewUrl(file.url)}
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
                  onClick={() => onRemoveExistingFile(idx)}
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
                      onClick={() => onPreviewUrl(preview)}
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
                  onClick={() => onRemoveNewFile(idx)}
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
  );
}
