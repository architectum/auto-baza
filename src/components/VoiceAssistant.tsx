import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Loader2, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import { buildAIErrorDetails } from '../lib/utils';
import { extractFromVoice } from '../services/ai';
import { useErrorModal, createErrorDetails } from './ErrorModal';

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
  const [transcript, setTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { showError } = useErrorModal();
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      // 'continuous = true' is very unstable on older Androids. We use false and auto-restart in onend.
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'uk-UA';

      recognitionRef.current.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = fullTranscript;
        setTranscript(fullTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        // Ignore common non-fatal errors on older Android devices
        if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
          return;
        }
        
        showError(createErrorDetails(
          new Error(`Помилка розпізнавання мовлення: ${event.error}`),
          'Помилка мікрофону',
          'SpeechRecognition',
          undefined,
          { errorType: event.error }
        ));
        
        cleanupTimers();
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if we are still meant to be recording (simulates continuous without crashing old Androids)
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };
    }
  }, []);

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

  const processTranscript = useCallback(async (text: string) => {
    if (text.trim().length > 0) {
      setIsProcessing(true);
      try {
        const extractedData = await extractFromVoice(text, context);
        onDataExtracted(extractedData);
      } catch (err) {
        console.error(err);
        showError(buildAIErrorDetails(err, 'Обробка голосових даних'));
      } finally {
        setIsProcessing(false);
      }
    }
  }, [context, onDataExtracted, showError]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      showError(createErrorDetails(
        new Error('Ваш браузер не підтримує розпізнавання мовлення (Web Speech API не доступний).'),
        'Браузер не підтримується',
        'SpeechRecognition'
      ));
      return;
    }
    transcriptRef.current = '';
    setTranscript('');
    setElapsedSeconds(0);
    setIsRecording(true);
    recognitionRef.current.start();

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Auto-stop after MAX_RECORDING_SECONDS
    autoStopRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
  };

  const stopRecording = async () => {
    cleanupTimers();
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Small delay to capture final transcript
    await new Promise(r => setTimeout(r, 300));
    const finalTranscript = transcriptRef.current;
    await processTranscript(finalTranscript);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const btnSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={cn("flex flex-col items-center gap-1 relative", className)}>
      {/* Recording state indicator */}
      {isRecording && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full absolute -top-10 whitespace-nowrap animate-fade-in z-10"
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

      {/* Processing indicator */}
      {isProcessing && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full absolute -top-10 whitespace-nowrap animate-fade-in z-10"
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
          "rounded-full flex items-center justify-center transition-all active:scale-90 outline-none relative",
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
