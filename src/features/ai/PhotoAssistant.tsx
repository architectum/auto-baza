import React, { useRef } from 'react';
import { Camera, ImagePlus, Loader2 } from '@shared/icons/Icons';
import { cn } from '@/lib/utils';
import { usePhotoAnalysis } from '@shared/hooks';
import { useLanguage } from '@shared/i18n';


interface PhotoAssistantProps {
  onDataExtracted: (data: any, photoFile?: File, base64?: string) => void;
  className?: string;
}

export function PhotoAssistant({ onDataExtracted, className }: PhotoAssistantProps) {
  const { t } = useLanguage();
  const { analyze, isProcessing } = usePhotoAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await analyze(file);
    if (result) {
      onDataExtracted(result.data, file, result.base64);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Camera Input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        ref={fileInputRef}
        className="hidden"
      />
      {/* Gallery Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleCapture}
        ref={galleryInputRef}
        className="hidden"
      />

      {/* Camera Button */}
      <button
        type="button"
        id="photo-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 outline-none border shrink-0",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
          color: 'var(--t-text-secondary)',
        }}
        title={t('ai.photoScanTitle')}
      >
        {isProcessing
          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-accent-primary)' }} />
          : <Camera className="w-5 h-5" />
        }
      </button>

      {/* Gallery Button */}
      <button
        type="button"
        id="gallery-btn"
        onClick={() => galleryInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 outline-none border shrink-0",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
          color: 'var(--t-text-secondary)',
        }}
        title={t('ai.photoGalleryTitle')}
      >
        {isProcessing
          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-accent-primary)' }} />
          : <ImagePlus className="w-5 h-5" />
        }
      </button>
    </div>
  );
}
