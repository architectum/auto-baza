import { useState } from 'react';
import { Settings, Sun, Moon, Palette, Check, Zap, Globe } from '@shared/icons/Icons';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@shared/i18n';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const { mode, setMode, colorSchemeId, setColorScheme, availableSchemes } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <Button
        variant="icon"
        size="md"
        id="settings-btn"
        onClick={() => setOpen(true)}
        title={t('nav.settings')}
      >
        <Settings className="w-5 h-5" />
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('settings.title')}
      >
        {/* Language Selection */}
        <div className="mb-6">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <Globe className="w-3.5 h-3.5" />
            {t('settings.languageTitle')}
          </div>
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: 'var(--t-surface-elevated)' }}
          >
            <button
              id="settings-lang-uk"
              onClick={() => setLanguage('uk')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: language === 'uk' ? 'var(--t-surface-card)' : 'transparent',
                color: language === 'uk' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                boxShadow: language === 'uk' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span>🇺🇦</span>
              <span>Українська</span>
            </button>
            <button
              id="settings-lang-en"
              onClick={() => setLanguage('en')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: language === 'en' ? 'var(--t-surface-card)' : 'transparent',
                color: language === 'en' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                boxShadow: language === 'en' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <Sun className="w-3.5 h-3.5" />
            {t('settings.themeModeTitle')}
          </div>
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: 'var(--t-surface-elevated)' }}
          >
            {([
              { key: 'light' as const, icon: <Sun className="w-4 h-4" />, label: t('settings.themeLight') },
              { key: 'dark' as const, icon: <Moon className="w-4 h-4" />, label: t('settings.themeDark') },
              { key: 'amoled' as const, icon: <Zap className="w-4 h-4" />, label: t('settings.themeAmoled') },
            ] as const).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                style={{
                  background: mode === key ? 'var(--t-surface-card)' : 'transparent',
                  color: mode === key ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                  boxShadow: mode === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Schemes */}
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <Palette className="w-3.5 h-3.5" />
            {t('settings.accentColorTitle')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {availableSchemes.map((scheme) => (
              <button
                key={scheme.id}
                id={`scheme-${scheme.id}`}
                onClick={() => setColorScheme(scheme.id)}
                className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  borderColor: colorSchemeId === scheme.id ? scheme.preview : 'var(--t-border-default)',
                  background: colorSchemeId === scheme.id ? `${scheme.preview}14` : 'var(--t-surface-elevated)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full shrink-0 ring-2 ring-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${scheme.preview}, ${scheme.preview}88)`,
                  }}
                />
                <span
                  className="text-sm font-medium truncate"
                  style={{
                    color: colorSchemeId === scheme.id ? scheme.preview : 'var(--t-text-secondary)',
                  }}
                >
                  {scheme.name}
                </span>
                {colorSchemeId === scheme.id && (
                  <Check
                    className="w-4 h-4 absolute right-3 shrink-0"
                    style={{ color: scheme.preview }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
