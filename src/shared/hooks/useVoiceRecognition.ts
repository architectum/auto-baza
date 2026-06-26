import { useState, useRef, useEffect, useCallback } from 'react';
import { extractFromAudio } from '@services/ai';
import { useErrorModal } from '@shared/lib/errorContext';
import { createErrorDetails, buildAIErrorDetails } from '@shared/lib/errorUtils';
import { logEvent } from '@services/firebase';


const MAX_RECORDING_SECONDS = 60;

export function useVoiceRecognition(context: 'car' | 'history' | 'client' | 'text', onDataExtracted: (data: any) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { showError } = useErrorModal();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupTimers();
  }, [cleanupTimers]);

  const processAudioBlob = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await extractFromAudio(base64Audio, blob.type || 'audio/webm', context);
      
      if (result.error) {
        showError(buildAIErrorDetails(result.error, 'Обробка голосових даних'));
      } else if (!result.data || Object.keys(result.data).length === 0) {
        showError(createErrorDetails(
          new Error("Не вдалося розпізнати дані з аудіо. Будь ласка, спробуйте говорити чіткіше або ближче до мікрофону."),
          "Голос не розпізнано",
          "GeminiAudioProcessing"
        ));
      } else {
        onDataExtracted(result.data);
        logEvent('voice_assistant_processed', { context });
      }
    } catch (err) {
      console.error(err);
      showError(buildAIErrorDetails(err, 'Обробка голосових даних'));
    } finally {
      setIsProcessing(false);
    }
  }, [context, onDataExtracted, showError]);

  const stop = useCallback(() => {
    cleanupTimers();
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [cleanupTimers]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        processAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setElapsedSeconds(0);
      setIsRecording(true);
      logEvent('voice_assistant_started', { context });

      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      autoStopRef.current = setTimeout(() => {
        stop();
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      showError(createErrorDetails(
        new Error('Не вдалося отримати доступ до мікрофона. Перевірте дозволи в браузері.'),
        'Помилка мікрофону',
        'MediaRecorder'
      ));
    }
  }, [context, processAudioBlob, showError, stop]);

  return { isRecording, isProcessing, elapsedSeconds, start, stop };
}
