import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Loader2, Square } from './Icons';
import { cn } from '../lib/utils';
import { buildAIErrorDetails } from '../lib/utils';
import { extractFromAudio } from '../services/ai';
import { useErrorModal, createErrorDetails } from './ErrorModal';
import { logEvent } from '../services/firebase';

const MAX_RECORDING_SECONDS = 60;

interface VoiceAssistantProps {
  context: 'car' | 'history' | 'client';
  onDataExtracted: (data: any) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function VoiceAssistant({ context, onDataExtracted, className, size = 'md' }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
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

      const extractedData = await extractFromAudio(base64Audio, blob.type || 'audio/webm', context);
      
      if (!extractedData || Object.keys(extractedData).length === 0) {
        showError(createErrorDetails(
          new Error("Не вдалося розпізнати дані з аудіо. Будь ласка, спробуйте говорити чіткіше або ближче до мікрофону."),
          "Голос не розпізнано",
          "GeminiAudioProcessing"
        ));
      } else {
        onDataExtracted(extractedData);
        logEvent('voice_assistant_processed', { context });
      }
    } catch (err) {
      console.error(err);
      showError(buildAIErrorDetails(err, 'Обробка голосових даних'));
    } finally {
      setIsProcessing(false);
    }
  }, [context, onDataExtracted, showError]);

  const startRecording = async () => {
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
      isRecordingRef.current = true;
      logEvent('voice_assistant_started', { context });

      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      showError(createErrorDetails(
        new Error('Не вдалося отримати доступ до мікрофона. Перевірте дозволи в браузері.'),
        'Помилка мікрофону',
        'MediaRecorder'
      ));
    }
  };

  const stopRecording = () => {
    cleanupTimers();
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const btnSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={cn("relative flex items-center justify-end", className)}>
      {/* Recording state indicator — LEFT of button */}
      {isRecording && (
        <div
          className="absolute right-[calc(100%+8px)] flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap voice-status-slide-in z-10"
          style={{
            background: 'var(--t-recording-bg)',
            border: '1px solid color-mix(in srgb, var(--t-recording) 40%, transparent)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--t-recording)' }}
          />
          <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--t-recording)' }}>
            {formatTime(elapsedSeconds)}
          </span>
          {/* Waveform bars */}
          <div className="flex items-center gap-px ml-1">
            {[0, 1, 2, 3, 4].map(i => (
              <span
                key={i}
                className="w-[3px] rounded-full voice-wave-bar"
                style={{
                  background: 'var(--t-recording)',
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Processing indicator — LEFT of button */}
      {isProcessing && (
        <div
          className="absolute right-[calc(100%+8px)] flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap voice-status-slide-in z-10"
          style={{
            background: 'var(--t-accent-primary-muted)',
            border: '1px solid var(--t-border-accent)',
          }}
        >
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--t-text-accent)' }} />
          <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--t-text-accent)' }}>
            Обробка AI...
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          btnSize,
          "rounded-full flex items-center justify-center transition-all active:scale-90 outline-none relative shrink-0",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
        style={{
          background: isRecording
            ? 'var(--t-recording)'
            : isProcessing
              ? 'var(--t-accent-primary-muted)'
              : 'var(--t-accent-primary)',
          color: isRecording || !isProcessing ? 'var(--t-text-on-accent)' : 'var(--t-text-accent)',
          boxShadow: isRecording
            ? '0 0 0 4px var(--t-recording-bg), 0 0 24px -4px var(--t-recording)'
            : '0 4px 12px -2px var(--t-accent-shadow)',
          animation: isRecording ? 'pulse-ring 1.5s ease-out infinite' : 'none',
        }}
        title="Диктувати через AI"
      >
        {isProcessing
          ? <Loader2 className={cn(iconSize, "animate-spin")} />
          : isRecording
            ? <Square className={iconSize} style={{ fill: 'currentColor' }} />
            : <Mic className={iconSize} />
        }
      </button>
    </div>
  );
}
