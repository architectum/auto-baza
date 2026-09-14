import React, { useRef, useState } from 'react';
import { X, Paperclip, Sparkles } from '@shared/icons/Icons';
import { isImageFile } from '@shared/lib/fileUtils';
import { useLanguage } from '@shared/i18n';

interface FileAttachmentsProps {
  existingFiles: { url: string; path: string; name?: string }[];
  newFiles: File[];
  newFilePreviews: string[];
  onRemoveExistingFile: (index: number) => void;
  onRemoveNewFile: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onPreviewUrl: (url: string) => void;
  carMake?: string;
  carModel?: string;
  analyses?: Record<string, { description: string; severity: 'minor' | 'moderate' | 'severe'; estimatedParts: string[]; loading?: boolean }>;
  onAnalyzePhoto?: (photoKey: string, base64: string, mimeType: string) => Promise<void>;
  onApplyDescription?: (text: string) => void;
}

export function FileAttachments({
  existingFiles,
  newFiles,
  newFilePreviews,
  onRemoveExistingFile,
  onRemoveNewFile,
  onAddFiles,
  onPreviewUrl,
  carMake,
  carModel,
  analyses = {},
  onAnalyzePhoto,
  onApplyDescription,
}: FileAttachmentsProps) {
  const { t } = useLanguage();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    onAddFiles(Array.from(files));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleAnalyzeNewFile = async (file: File, key: string) => {
    if (!onAnalyzePhoto) return;
    setLocalErrors(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await onAnalyzePhoto(key, base64, file.type);
    } catch (err) {
      console.error("Failed to read local file:", err);
      setLocalErrors(prev => ({ ...prev, [key]: t('diagnostics.errorAnalysis') }));
    }
  };

  const handleAnalyzeExistingFile = async (url: string, key: string) => {
    if (!onAnalyzePhoto) return;
    setLocalErrors(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    try {
      // Trigger loading state in parent
      await onAnalyzePhoto(key, '', 'loading');
      
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await onAnalyzePhoto(key, base64, blob.type);
    } catch (err) {
      console.error("Failed to fetch existing file for analysis:", err);
      await onAnalyzePhoto(key, 'error', 'error');
      setLocalErrors(prev => ({
        ...prev,
        [key]: t('diagnostics.errorAnalysis')
      }));
    }
  };

  const renderAnalysisCard = (key: string) => {
    const analysis = analyses[key];
    const localError = localErrors[key];
    
    if (!analysis && !localError) return null;

    return (
      <div 
        className="mt-2.5 p-3.5 rounded-xl border space-y-2.5 text-xs animate-fade-in" 
        style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}
      >
        {analysis?.loading ? (
          <div className="flex items-center gap-2 py-1 font-medium" style={{ color: 'var(--t-text-secondary)' }}>
            <svg className="w-4.5 h-4.5 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
            </svg>
            {t('history.aiAnalyzingDamage')}
          </div>
        ) : localError ? (
          <div className="text-red-500 font-medium leading-relaxed">
            ⚠️ {localError}
          </div>
        ) : analysis ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                {t('history.aiDamageResult')}
              </span>
              <span 
                className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[10px]" 
                style={{
                  background: analysis.severity === 'severe' ? 'var(--t-status-problem-bg)' : analysis.severity === 'moderate' ? 'color-mix(in srgb, #f97316 12%, transparent)' : 'var(--t-accent-primary-muted)',
                  color: analysis.severity === 'severe' ? 'var(--t-status-problem)' : analysis.severity === 'moderate' ? '#f97316' : 'var(--t-text-accent)'
                }}
              >
                {analysis.severity === 'severe' ? t('history.severitySevere') : analysis.severity === 'moderate' ? t('history.severityModerate') : t('history.severityMinor')}
              </span>
            </div>
            <p className="leading-relaxed" style={{ color: 'var(--t-text-primary)' }}>
              {analysis.description}
            </p>
            {analysis.estimatedParts && analysis.estimatedParts.length > 0 && (
              <div className="space-y-1">
                <span className="font-bold text-[10px] uppercase tracking-wider block" style={{ color: 'var(--t-text-muted)' }}>
                  {t('history.estimatedParts')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.estimatedParts.map((part, pidx) => (
                    <span 
                      key={pidx} 
                      className="px-2 py-0.5 rounded font-semibold text-[10px] border" 
                      style={{
                        background: 'var(--t-surface-elevated)',
                        borderColor: 'var(--t-border-default)',
                        color: 'var(--t-text-secondary)'
                      }}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {onApplyDescription && (
              <button
                type="button"
                onClick={() => onApplyDescription(analysis.description)}
                className="w-full py-1.5 mt-1 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                style={{
                  background: 'var(--t-surface-card)',
                  borderColor: 'var(--t-border-default)',
                  color: 'var(--t-text-secondary)'
                }}
              >
                {t('history.addToDescription')}
              </button>
            )}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 px-0.5" style={{ color: 'var(--t-text-muted)' }}>
        {t('history.attachFiles')}
      </label>
      
      {(existingFiles.length > 0 || newFiles.length > 0) && (
        <div className="flex flex-col gap-2 mb-3 max-h-72 overflow-y-auto">
          {/* Existing Files */}
          {existingFiles.map((file, idx) => {
            const isImg = isImageFile(file.path || file.url);
            const key = file.url;
            const analysis = analyses[key];
            return (
              <div 
                key={`existing-${idx}`}
                className="flex flex-col gap-1 p-2.5 rounded-xl border"
                style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)' }}
              >
                <div className="flex items-center justify-between gap-2">
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImg && onAnalyzePhoto && (
                      <button
                        type="button"
                        onClick={() => handleAnalyzeExistingFile(file.url, key)}
                        disabled={analysis?.loading}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: 'var(--t-accent-primary-muted)',
                          color: 'var(--t-text-accent)',
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('history.analyzeBtn')}
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveExistingFile(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                      style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                      title={t('common.delete')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {isImg && renderAnalysisCard(key)}
              </div>
            );
          })}

          {/* New Files */}
          {newFiles.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            const preview = newFilePreviews[idx];
            const key = file.name;
            const analysis = analyses[key];
            return (
              <div 
                key={`new-${idx}`}
                className="flex flex-col gap-1 p-2.5 rounded-xl border"
                style={{ borderColor: 'var(--t-accent-primary-muted)', background: 'var(--t-surface-elevated)' }}
              >
                <div className="flex items-center justify-between gap-2">
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
                        {t('history.newBadge')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImg && onAnalyzePhoto && (
                      <button
                        type="button"
                        onClick={() => handleAnalyzeNewFile(file, key)}
                        disabled={analysis?.loading}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: 'var(--t-accent-primary-muted)',
                          color: 'var(--t-text-accent)',
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('history.analyzeBtn')}
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveNewFile(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                      style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                      title={t('common.delete')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {isImg && renderAnalysisCard(key)}
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
        <span className="text-sm font-medium">{t('history.attachMoreFiles')}</span>
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
