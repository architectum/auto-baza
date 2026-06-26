import { useState, useCallback } from 'react';
import { extractFromPhoto } from '@services/ai';
import { useErrorModal } from '@shared/lib/errorContext';
import { createErrorDetails, buildAIErrorDetails } from '@shared/lib/errorUtils';

export function usePhotoAnalysis() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { showError } = useErrorModal();

  const analyze = useCallback(async (file: File): Promise<{ data: any; base64: string } | null> => {
    setIsProcessing(true);
    try {
      const base64Str = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await extractFromPhoto(base64Str, file.type);
      if (result.error) {
        showError(buildAIErrorDetails(result.error, 'Обробка зображення AI'));
        return null;
      } else {
        return { data: result.data, base64: base64Str };
      }
    } catch (err) {
      console.error(err);
      showError(buildAIErrorDetails(err, 'Обробка зображення AI'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [showError]);

  return { analyze, isProcessing };
}
