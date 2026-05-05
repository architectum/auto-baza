import { useState, useRef } from 'react';
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
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-500/20",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
        title="Extract from Photo"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-blue-600" /> : <Camera className="w-5 h-5 md:w-6 md:h-6" />}
      </button>
    </div>
  );
}
