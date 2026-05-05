import { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, StopCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { extractFromVoice } from '../services/ai';

interface VoiceAssistantProps {
  context: 'car' | 'history';
  onDataExtracted: (data: any) => void;
  className?: string;
}

export function VoiceAssistant({ context, onDataExtracted, className }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'uk-UA';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => prev + currentTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('Ваш браузер не підтримує розпізнавання мовлення.');
      return;
    }
    setTranscript('');
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (transcript.trim().length > 0) {
      setIsProcessing(true);
      try {
        const extractedData = await extractFromVoice(transcript, context);
        onDataExtracted(extractedData);
      } catch (err) {
        console.error(err);
        alert('Не вдалося обробити голосові дані.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2 relative", className)}>
      <button
        type="button"
        id="voice-btn"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 outline-none",
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
            ? '0 0 0 4px var(--t-recording-bg)'
            : '0 4px 12px -2px var(--t-accent-shadow)',
          animation: isRecording ? 'pulse-ring 1.5s ease-out infinite' : 'none',
        }}
        title="Диктувати через AI"
      >
        {isProcessing
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : isRecording
            ? <StopCircle className="w-5 h-5" />
            : <Mic className="w-5 h-5" />
        }
      </button>
      {isRecording && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide absolute -top-5 whitespace-nowrap"
          style={{ color: 'var(--t-recording)' }}
        >
          Запис...
        </span>
      )}
      {isProcessing && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide absolute -top-5 whitespace-nowrap"
          style={{ color: 'var(--t-text-accent)' }}
        >
          Обробка AI...
        </span>
      )}
    </div>
  );
}
