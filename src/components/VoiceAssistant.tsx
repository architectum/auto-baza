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
      alert('Your browser does not support Speech Recognition.');
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
        alert('Failed to process voice data.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
          isRecording ? "bg-red-500 animate-pulse text-white hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700 text-white",
          isProcessing && "opacity-60 cursor-not-allowed bg-blue-400 hover:bg-blue-400"
        )}
        title="Dictate via AI"
      >
        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : isRecording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
      {isRecording && <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wide absolute -top-5">Recording...</span>}
      {isProcessing && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide absolute -top-5">Processing via AI...</span>}
    </div>
  );
}
