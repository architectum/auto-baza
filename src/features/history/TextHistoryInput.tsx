import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Sparkles } from '@shared/icons/Icons';
import { DifficultySelector } from './components/DifficultySelector';
import { Button, Input, Textarea, Select } from '@shared/ui';
import { suggestCost, analyzeDamagePhoto } from '@services/ai';
import { useDebounce } from '@shared/hooks';
import { HistoryEntry } from '@types';
import { useLanguage } from '@shared/i18n';
import { useCurrency } from '@shared/context/CurrencyContext';

interface Props {
  onSubmit: (data: {
    type: string;
    text: string;
    photoFiles?: File[];
    cost?: number;
    spentHours?: number;
    difficulty?: number;
    createdAt?: string;
    reminderDate?: string;
    reminderTime?: string;
    reminderStatus?: 'pending' | 'sent' | 'dismissed';
    reminderRecurrence?: 'once' | 'daily' | 'weekly' | 'monthly' | null;
  }) => void;
  /** When true, the input is blocked (mileage must be added first) */
  disabled?: boolean;
  /** Called when user clicks the button while disabled */
  onDisabledClick?: () => void;
  carMake?: string;
  history?: HistoryEntry[];
}

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function TextHistoryInput({ onSubmit, disabled, onDisabledClick, carMake, history }: Props) {
  const { t } = useLanguage();
  const { currencySymbol, formatMoney } = useCurrency();
  const typeOptions = [
    { value: 'note', label: t('history.note'), color: 'var(--t-status-note)', bg: 'var(--t-status-note-bg)' },
    { value: 'problem', label: t('history.problem'), color: 'var(--t-status-problem)', bg: 'var(--t-status-problem-bg)' },
    { value: 'solution', label: t('history.solution'), color: 'var(--t-status-solution)', bg: 'var(--t-status-solution-bg)' },
  ];

  const [text, setText] = useState('');
  const [type, setType] = useState<string>('note');
  const [cost, setCost] = useState('');
  const [spentHours, setSpentHours] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [reminderDate, setReminderDate] = useState(getTomorrowDateString());
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderRecurrence, setReminderRecurrence] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [expanded, setExpanded] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // AI Damage Photo Analysis (Step 17 - 3.7.3)
  const [analyses, setAnalyses] = useState<Record<string, { description: string; severity: 'minor' | 'moderate' | 'severe'; estimatedParts: string[]; loading?: boolean }>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleAnalyzePhoto = async (file: File, key: string) => {
    setAnalyses(prev => ({
      ...prev,
      [key]: { description: '', severity: 'minor', estimatedParts: [], loading: true }
    }));
    setLocalErrors(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await analyzeDamagePhoto(base64, file.type, carMake, '');
      if (res.data) {
        setAnalyses(prev => ({
          ...prev,
          [key]: {
            description: res.data.description,
            severity: res.data.severity,
            estimatedParts: res.data.estimatedParts,
            loading: false
          }
        }));
      } else {
        throw new Error(res.error?.message || t('common.error'));
      }
    } catch (err) {
      console.error("Failed to analyze photo in quick input:", err);
      setAnalyses(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      setLocalErrors(prev => ({
        ...prev,
        [key]: t('diagnostics.errorAnalysis')
      }));
    }
  };

  const handleApplyDescription = (appliedText: string) => {
    setText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return appliedText;
      return `${trimmed}\n\n${t('history.aiDamagePrefix')}\n${appliedText}`;
    });
  };

  // AI Cost Suggestion (Step 16 - 3.7.2)
  const debouncedText = useDebounce(text, 1200);
  const [suggestedCost, setSuggestedCost] = useState<number | null>(null);
  const [costReasoning, setCostReasoning] = useState<string>('');
  const [loadingCost, setLoadingCost] = useState(false);

  useEffect(() => {
    if (type !== 'solution' || !debouncedText || debouncedText.trim().length < 4) {
      setSuggestedCost(null);
      setCostReasoning('');
      return;
    }

    const fetchCostSuggestion = async () => {
      setLoadingCost(true);
      try {
        const res = await suggestCost(
          debouncedText,
          carMake || '',
          history || []
        );
        if (res.data && res.data.suggestedCost > 0) {
          setSuggestedCost(res.data.suggestedCost);
          setCostReasoning(res.data.reasoning);
        } else {
          setSuggestedCost(null);
        }
      } catch (err) {
        console.error("Failed to fetch cost suggestion:", err);
      } finally {
        setLoadingCost(false);
      }
    };

    fetchCostSuggestion();
  }, [debouncedText, type, carMake, history]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      type,
      text: text.trim(),
      photoFiles: photoFiles.length > 0 ? photoFiles : undefined,
      cost: type === 'solution' && cost ? Number(cost) : undefined,
      spentHours: type === 'solution' && spentHours ? Number(spentHours) : undefined,
      difficulty: type === 'solution' ? difficulty : undefined,
      reminderDate: type === 'reminder' ? reminderDate : undefined,
      reminderTime: type === 'reminder' ? reminderTime : undefined,
      reminderStatus: type === 'reminder' ? 'pending' : undefined,
      reminderRecurrence: type === 'reminder' ? reminderRecurrence : null,
      createdAt: new Date().toISOString(),
    });
    setText('');
    setCost('');
    setSpentHours('');
    setDifficulty(1);
    setReminderDate(getTomorrowDateString());
    setReminderTime('09:00');
    setReminderRecurrence('once');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setAnalyses({});
    setLocalErrors({});
    setExpanded(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const selectedFiles = Array.from(files);
    setPhotoFiles(prev => [...prev, ...selectedFiles]);
    
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPhotoPreviews(prev => [...prev, '']);
      }
    });
    
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const selected = typeOptions.find(t => t.value === type) || typeOptions[0];

  if (!expanded) {
    return (
      <button
        onClick={() => {
          if (disabled) {
            onDisabledClick?.();
            return;
          }
          setExpanded(true);
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold active:scale-[0.98] border cursor-pointer transition-all"
        style={{
          background: disabled ? 'var(--t-surface-elevated)' : 'var(--t-surface-card)',
          borderColor: disabled ? 'var(--t-border-default)' : 'var(--t-border-accent)',
          color: disabled ? 'var(--t-text-muted)' : 'var(--t-text-secondary)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Send className="w-4 h-4" />
        {t('history.addTextEntryBtn')}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-accent)', boxShadow: '0 12px 32px -24px var(--t-accent-shadow)' }}>
      <div className="flex gap-2 mb-3">
        {typeOptions.map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            style={{
              background: type === t.value ? t.bg : 'var(--t-surface-elevated)',
              color: type === t.value ? t.color : 'var(--t-text-muted)',
              border: type === t.value ? `1px solid color-mix(in srgb, ${t.color} 30%, transparent)` : '1px solid transparent',
            }}
          >{t.label}</button>
        ))}
      </div>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('history.textPlaceholder')}
        autoFocus
        className="mb-3"
        minRows={3}
        enableVoice
        voiceContext="text"
        onVoiceInput={transcribed => setText(prev => prev ? `${prev.trim()}\n${transcribed}` : transcribed)}
      />

      {type === 'solution' && (
        <>
          <div className="mb-3">
            <Input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder={t('history.costLabel')}
              min="0"
              step="0.01"
              suffix={<span className="text-sm font-bold font-mono">{currencySymbol}</span>}
              className="font-mono"
            />
            {loadingCost && (
              <div className="text-xs text-muted flex items-center gap-1.5 mt-1.5 px-1 animate-pulse" style={{ color: 'var(--t-text-muted)' }}>
                <svg className="w-3.5 h-3.5 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                </svg>
                {t('history.evaluatingCost')}
              </div>
            )}
            {!loadingCost && suggestedCost !== null && suggestedCost > 0 && (
              <div className="text-xs mt-1.5 px-1 flex flex-wrap items-center justify-between gap-2" style={{ color: 'var(--t-text-secondary)' }}>
                <span title={costReasoning} className="cursor-help flex items-center gap-1">
                  {t('history.recommendedCost')} <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(suggestedCost)}</strong>
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); setCost(String(suggestedCost)); }}
                  className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95 transition-all cursor-pointer"
                >
                  {t('history.fillCostBtn')}
                </button>
              </div>
            )}
          </div>
          
          <Input
            type="number"
            value={spentHours}
            onChange={e => setSpentHours(e.target.value)}
            placeholder={t('history.timeSpentLabel')}
            min="0"
            step="0.1"
            suffix={<span className="text-sm font-bold font-mono">{t('common.hrs')}</span>}
            className="mb-3 font-mono"
          />

          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{t('history.difficultyLabel')}</span>
              <DifficultySelector difficulty={difficulty} onChange={setDifficulty} size="sm" />
            </div>
          </div>
        </>
      )}

      {type === 'reminder' && (
        <div className="mb-3 flex flex-col gap-3 animate-fade-in">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="date"
                label={t('history.reminderDate')}
                value={reminderDate}
                onChange={e => setReminderDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                label={t('history.reminderTime')}
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
              />
            </div>
          </div>
          <Select
            label={t('history.recurrence')}
            value={reminderRecurrence}
            onChange={e => setReminderRecurrence(e.target.value as any)}
            options={[
              { value: 'once', label: t('history.recurrenceOnce') },
              { value: 'daily', label: t('history.recurrenceDaily') },
              { value: 'weekly', label: t('history.recurrenceWeekly') },
              { value: 'monthly', label: t('history.recurrenceMonthly') },
            ]}
          />
        </div>
      )}

      {/* Photo and file previews */}
      {photoFiles.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {photoFiles.map((file, index) => {
            const preview = photoPreviews[index];
            const isImg = file.type.startsWith('image/');
            const key = file.name;
            const analysis = analyses[key];
            const localError = localErrors[key];

            return (
              <div 
                key={index} 
                className="flex flex-col gap-1 p-2.5 rounded-xl border animate-fade-in"
                style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-elevated)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isImg && preview ? (
                      <img src={preview} alt={file.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-default)' }}>
                        <Paperclip className="w-5 h-5 text-muted" />
                      </div>
                    )}
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--t-text-secondary)' }}>
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImg && (
                      <button
                        type="button"
                        onClick={() => handleAnalyzePhoto(file, key)}
                        disabled={analysis?.loading}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        style={{
                          background: 'var(--t-accent-primary-muted)',
                          color: 'var(--t-text-accent)',
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('history.analyzeBtn')}
                      </button>
                    )}
                    <button
                      onClick={() => removePhoto(index)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 active:scale-90"
                      style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Analysis Result Card */}
                {(analysis || localError) && (
                  <div 
                    className="mt-2 p-3 rounded-xl border space-y-2 text-xs animate-fade-in" 
                    style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}
                  >
                    {analysis?.loading ? (
                      <div className="flex items-center gap-2 py-1 font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                        <svg className="w-4 h-4 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-3-6.7" />
                        </svg>
                        {t('history.aiAnalyzingDamage')}
                      </div>
                    ) : localError ? (
                      <div className="text-red-500 font-medium">
                        ⚠️ {localError}
                      </div>
                    ) : analysis ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                            {t('history.aiDamageResult')}
                          </span>
                          <span 
                            className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[10px]" 
                            style={{
                              background: analysis.severity === 'severe' ? 'var(--t-status-problem-bg)' : analysis.severity === 'moderate' ? 'color-mix(in srgb, #f97316 12%, transparent)' : 'var(--t-accent-primary-muted)',
                              color: analysis.severity === 'severe' ? 'var(--t-status-problem)' : analysis.severity === 'moderate' ? '#f97316' : 'var(--t-text-accent)'
                            }}
                          >
                            {analysis.severity === 'severe' ? t('history.severitySevere') : analysis.severity === 'moderate' ? t('history.severityModerate') : t('history.severityMinor')}
                          </span>
                        </div>
                        <p className="leading-relaxed" style={{ color: 'var(--t-text-primary)' }}>
                          {analysis.description}
                        </p>
                        {analysis.estimatedParts && analysis.estimatedParts.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider block" style={{ color: 'var(--t-text-muted)' }}>
                              {t('history.estimatedParts')}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {analysis.estimatedParts.map((part, pidx) => (
                                <span 
                                  key={pidx} 
                                  className="px-2 py-0.5 rounded font-semibold text-[10px] border" 
                                  style={{
                                    background: 'var(--t-surface-elevated)',
                                    borderColor: 'var(--t-border-default)',
                                    color: 'var(--t-text-secondary)'
                                  }}
                                >
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApplyDescription(analysis.description)}
                          className="w-full py-1.5 mt-1 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                          style={{
                            background: 'var(--t-surface-card)',
                            borderColor: 'var(--t-border-default)',
                            color: 'var(--t-text-secondary)'
                          }}
                        >
                          {t('history.addToDescription')}
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="secondary"
          onClick={() => { setExpanded(false); setText(''); setCost(''); setSpentHours(''); setDifficulty(1); setPhotoFiles([]); setPhotoPreviews([]); }}
        >
          {t('common.cancel')}
        </Button>

        {/* Photo attach button */}
        <input
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          className="hidden"
          ref={photoInputRef}
          onChange={handlePhotoSelect}
        />
        <Button
          variant="icon"
          onClick={() => photoInputRef.current?.click()}
          style={{
            background: photoFiles.length > 0 ? 'var(--t-accent-primary-muted)' : 'var(--t-surface-elevated)',
            color: photoFiles.length > 0 ? 'var(--t-text-accent)' : 'var(--t-text-muted)',
          }}
          title={t('history.attachFiles')}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Button 
          onClick={handleSubmit} 
          disabled={!text.trim()}
          className="flex-1 t-accent-gradient"
          style={{ color: 'var(--t-text-on-accent)' }}
          icon={<Send className="w-4 h-4" />}
        >
          {t('history.addEntryBtn')}
        </Button>
      </div>
    </div>
  );
}
