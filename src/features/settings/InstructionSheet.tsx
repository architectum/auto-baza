import { useState } from 'react';
import { 
  HelpCircle, CheckCircle, Car, Search, Plus, Wrench, Settings as SettingsIcon, 
  LayoutTemplate, Mic, Camera, Link2, FileText, BrainCircuit, BarChart3, 
  LogOut, Phone, Sparkles, WifiOff, Download, Activity, Paperclip, AlertCircle 
} from '@shared/icons/Icons';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import { useLanguage } from '@shared/i18n';

export function InstructionSheet() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="icon"
        size="md"
        id="instruction-btn"
        onClick={() => setOpen(true)}
        title={t('nav.guide')}
        style={{ color: 'var(--t-text-muted)' }}
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('instructions.title')}
        maxHeight="90dvh"
      >
        <div className="space-y-6 text-sm pb-6" style={{ color: 'var(--t-text-secondary)' }}>

          {/* Section 1 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>1</div>
              {t('instructions.sec1Title')}
            </h3>
            <p>
              {t('instructions.sec1Desc')}
            </p>
            <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-text-muted)' }}>
              <LogOut className="w-4 h-4 shrink-0 t-text-accent" />
              <span>{t('instructions.sec1Tip')}</span>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>2</div>
              {t('instructions.sec2Title')}
            </h3>
            <p>
              {t('instructions.sec2Desc')}
            </p>
            <ul className="space-y-2.5 list-none pl-1">
              <li className="flex gap-2">
                <Search className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec2Search')}</span>
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-problem)' }} />
                <span>{t('instructions.sec2Badges')}</span>
              </li>
              <li className="flex gap-2">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-solution)' }} />
                <span>{t('instructions.sec2Call')}</span>
              </li>
              <li className="flex gap-2">
                <Plus className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec2Add')}</span>
              </li>
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec2Header')}</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>3</div>
              {t('instructions.sec3Title')}
            </h3>
            <p>{t('instructions.sec3Desc')}</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <Car className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec3Plates')}</span>
              </li>
              <li className="flex gap-2">
                <Camera className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec3Photo')}</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec3VoiceCar')}</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec3VoiceClient')}</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec3Duplicate')}</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>4</div>
              {t('instructions.sec4Title')}
            </h3>
            <p>{t('instructions.sec4Desc')}</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <Activity className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-mileage)' }} />
                <span>{t('instructions.sec4Mileage')}</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec4Voice')}</span>
              </li>
              <li className="flex gap-2">
                <Wrench className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec4Manual')}</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec4AiHints')}</span>
              </li>
              <li className="flex gap-2">
                <Paperclip className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec4Photos')}</span>
              </li>
              <li className="flex gap-2">
                <Link2 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec4Links')}</span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>5</div>
              {t('instructions.sec5Title')}
            </h3>
            <p>{t('instructions.sec5Desc')}</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <FileText className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec5Upload')}</span>
              </li>
              <li className="flex gap-2">
                <BrainCircuit className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec5Ai')}</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec5Share')}</span>
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>6</div>
              {t('instructions.sec6Title')}
            </h3>
            <p>
              {t('instructions.sec6Desc')}
            </p>
            <ul className="space-y-2.5 list-none pl-1">
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec6Periods')}</span>
              </li>
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec6Kpis')}</span>
              </li>
              <li className="flex gap-2">
                <Download className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec6Pdf')}</span>
              </li>
              <li className="flex gap-2">
                <Download className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec6Csv')}</span>
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>7</div>
              {t('instructions.sec7Title')}
            </h3>
            <p>{t('instructions.sec7Desc')}</p>
            <ul className="space-y-2 list-none pl-1">
              <li className="flex gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec7Themes')}</span>
              </li>
              <li className="flex gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec7Colors')}</span>
              </li>
              <li className="flex gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec7Currency')}</span>
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>8</div>
              {t('instructions.sec8Title')}
            </h3>
            <p>{t('instructions.sec8Desc')}</p>
            <ul className="space-y-2 list-none pl-1">
              <li className="flex gap-2">
                <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec8Android')}</span>
              </li>
              <li className="flex gap-2">
                <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec8Ios')}</span>
              </li>
              <li className="flex gap-2">
                <WifiOff className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span>{t('instructions.sec8Offline')}</span>
              </li>
            </ul>
          </section>

        </div>
      </BottomSheet>
    </>
  );
}
