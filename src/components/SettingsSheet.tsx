import { useState } from 'react';
import { Settings, X, Sun, Moon, Palette, Check } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const { mode, toggleMode, colorSchemeId, setColorScheme, availableSchemes } = useTheme();

  return (
    <>
      <button
        id="settings-btn"
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-xl t-text-secondary transition-all active:scale-95"
        style={{ background: 'var(--t-surface-elevated)' }}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 animate-fade-in"
          style={{ background: 'var(--t-surface-overlay)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80dvh' }}
      >
        <div
          className="rounded-t-3xl border-t safe-bottom overflow-y-auto"
          style={{
            background: 'var(--t-surface-card)',
            borderColor: 'var(--t-border-default)',
            maxHeight: '80dvh',
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: 'var(--t-border-default)' }}
            />
          </div>

          <div className="px-5 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--t-text-primary)' }}
              >
                Appearance
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95"
                style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="mb-6">
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <Sun className="w-3.5 h-3.5" />
                Theme Mode
              </div>
              <div
                className="flex rounded-2xl p-1 gap-1"
                style={{ background: 'var(--t-surface-elevated)' }}
              >
                <button
                  onClick={() => { if (mode !== 'light') toggleMode(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: mode === 'light' ? 'var(--t-surface-card)' : 'transparent',
                    color: mode === 'light' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                    boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => { if (mode !== 'dark') toggleMode(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: mode === 'dark' ? 'var(--t-surface-card)' : 'transparent',
                    color: mode === 'dark' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                    boxShadow: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>

            {/* Color Schemes */}
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <Palette className="w-3.5 h-3.5" />
                Accent Color
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    id={`scheme-${scheme.id}`}
                    onClick={() => setColorScheme(scheme.id)}
                    className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98]"
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
          </div>
        </div>
      </div>
    </>
  );
}
