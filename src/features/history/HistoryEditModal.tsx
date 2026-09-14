import React, { useState } from 'react';
import { X, Trash2, Activity } from '@shared/icons/Icons';
import { HistoryEntry } from '@types';
import { ImagePreview } from '@shared/ui/ImagePreview';
import { Button } from '@shared/ui/Button';
import { EditEntryForm } from './components/EditEntryForm';
import { useLanguage } from '@shared/i18n';

interface Props {
  entry: HistoryEntry;
  onSave: (updated: Partial<HistoryEntry>, newPhotoFiles?: File[], remainingFiles?: { url: string; path: string }[]) => void;
  onDelete: () => void;
  onClose: () => void;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  history?: HistoryEntry[];
}

export function HistoryEditModal({ entry, onSave, onDelete, onClose, carMake, carModel, carYear, history }: Props) {
  const { t } = useLanguage();
  const isMileage = entry.type === 'mileage';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full max-w-lg mx-auto rounded-t-2xl sm:rounded-2xl border animate-fade-in-up flex flex-col max-h-[90dvh] sm:max-h-[85vh] shadow-2xl my-auto"
        style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0" style={{ borderColor: 'var(--t-border-subtle)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--t-text-primary)' }}>
            {isMileage ? t('history.mileageRecordTitle') : t('history.editEntryTitle')}
          </h3>
          <Button variant="icon" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {isMileage ? (
            /* Mileage entry — read-only display, only delete is available */
            <div>
              <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--t-status-mileage-bg)', borderColor: 'color-mix(in srgb, var(--t-status-mileage) 30%, transparent)' }}>
                <Activity className="w-6 h-6 shrink-0" style={{ color: 'var(--t-status-mileage)' }} />
                <div>
                  <span className="text-2xl font-bold font-mono" style={{ color: 'var(--t-status-mileage)' }}>
                    {(entry.runtimeMileage || 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--t-status-mileage)' }}>{t('common.km')}</span>
                </div>
              </div>
              <p className="text-xs mt-2.5 px-1" style={{ color: 'var(--t-text-muted)' }}>
                {t('history.mileageDeleteNote')}
              </p>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="danger"
                  size="md"
                  onClick={onDelete}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  {t('common.delete')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={onClose}
                >
                  {t('common.close')}
                </Button>
              </div>
            </div>
          ) : (
            /* Non-mileage entry form split into its own component */
            <EditEntryForm
              entry={entry}
              carMake={carMake}
              carModel={carModel}
              carYear={carYear}
              history={history}
              onSave={onSave}
              onDelete={onDelete}
              onPreviewUrl={setPreviewUrl}
            />
          )}
        </div>
      </div>

      {previewUrl && (
        <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
}
