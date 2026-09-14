import { Mic, Loader2, Square } from '@shared/icons/Icons';
import { cn } from '@/lib/utils';
import { useVoiceRecognition } from '@shared/hooks';
import { useLanguage } from '@shared/i18n';

interface VoiceAssistantProps {
  context: 'car' | 'history' | 'client';
  onDataExtracted: (data: any) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function VoiceAssistant({ context, onDataExtracted, className, size = 'md' }: VoiceAssistantProps) {
  const { t } = useLanguage();
  const { isRecording, isProcessing, elapsedSeconds, start, stop } = useVoiceRecognition(context, onDataExtracted);

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
            {t('ai.aiProcessing')}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={isRecording ? stop : start}
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
        title={t('ai.voiceDictateTitle')}
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
