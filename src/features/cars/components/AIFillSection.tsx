import { Camera, Mic } from '@shared/icons/Icons';
import { PhotoAssistant } from '@features/ai/PhotoAssistant';
import { VoiceAssistant } from '@features/ai/VoiceAssistant';
import { ProgressBar } from '@shared/ui/ProgressBar';
import { useLanguage } from '@shared/i18n';

interface AIFillSectionProps {
  userId?: string;
  isNew: boolean;
  uploadProgress: number | null;
  handleAIData: (data: Record<string, any>, fields: string[], photoFile?: File, base64?: string) => void;
  carFields: string[];
  carVoiceFields: string[];
}

export function AIFillSection({
  userId,
  isNew,
  uploadProgress,
  handleAIData,
  carFields,
  carVoiceFields,
}: AIFillSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 gap-3 mb-5">
      <div className="flex flex-col gap-2 p-3.5 rounded-xl" style={{ background: 'var(--t-surface-elevated)', border: '1px solid var(--t-border-default)' }}>
        <div className="flex items-center justify-between gap-3 w-full">
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
            <Camera className="w-4 h-4" style={{ color: 'var(--t-text-accent)' }} /> {t('cars.fromPhoto')}
          </span>
          <PhotoAssistant onDataExtracted={(d, file, b64) => handleAIData(d, carFields, file, b64)} />
        </div>
        {uploadProgress !== null && (
          <ProgressBar progress={uploadProgress} className="mt-2" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl" style={{ background: 'var(--t-accent-primary-muted)', border: '1px solid var(--t-border-accent)' }}>
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-accent)' }}>
          <Mic className="w-4 h-4" /> {t('cars.fromVoice')}
        </span>
        <VoiceAssistant context="car" onDataExtracted={d => handleAIData(d, carVoiceFields)} />
      </div>
    </div>
  );
}
