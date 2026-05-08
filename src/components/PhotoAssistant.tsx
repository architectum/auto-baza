import React, { useState, useRef } from 'react';
import { Camera, ImagePlus, Loader2 } from './Icons';
import { cn, buildAIErrorDetails } from '../lib/utils';
import { extractFromPhoto } from '../services/ai';
import { useErrorModal, createErrorDetails } from './ErrorModal';

interface PhotoAssistantProps {
  onDataExtracted: (data: any) => void;
  className?: string;
}

export function PhotoAssistant({ onDataExtracted, className }: PhotoAssistantProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { showError } = useErrorModal();

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Str = (reader.result as string).split(',')[1];
          const extractedData = await extractFromPhoto(base64Str, file.type);
          onDataExtracted(extractedData);
        } catch (err) {
          console.error(err);
          showError(buildAIErrorDetails(err, 'Обробка зображення AI'));
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        showError(createErrorDetails(
          new Error('Не вдалося прочитати файл зображення'),
          'Помилка читання файлу',
          'FileReader'
        ));
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showError(buildAIErrorDetails(err, 'Обробка зображення'));
      setIsProcessing(false);
    }
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
        title="Зробити фото"
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
        title="Вибрати з галереї"
      >
        {isProcessing
          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-accent-primary)' }} />
          : <ImagePlus className="w-5 h-5" />
        }
      </button>
    </div>
  );
}
