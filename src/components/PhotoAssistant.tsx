import React, { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { extractFromPhoto } from '../services/ai';

interface PhotoAssistantProps {
  onDataExtracted: (data: any) => void;
  className?: string;
}

export function PhotoAssistant({ onDataExtracted, className }: PhotoAssistantProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        const extractedData = await extractFromPhoto(base64Str, file.type);
        onDataExtracted(extractedData);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Failed to process image');
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        ref={fileInputRef}
        className="hidden"
      />
      <button
        type="button"
        id="photo-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 outline-none border",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
          color: 'var(--t-text-secondary)',
        }}
        title="Extract from Photo"
      >
        {isProcessing
          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-accent-primary)' }} />
          : <Camera className="w-5 h-5" />
        }
      </button>
    </div>
  );
}
