import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Palette, Check, Zap, Bell } from '@shared/icons/Icons';
import { useTheme } from '@/components/ThemeProvider';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import { useAuth } from '@shared/context/AuthContext';
import { requestNotificationPermission, saveFcmToken } from '@services/notifications';
import { db } from '@services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@shared/context/ToastContext';

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const { mode, setMode, colorSchemeId, setColorScheme, availableSchemes } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);

  const [saving, setSaving] = useState(false);

  // Load settings on open or when user changes
  useEffect(() => {
    if (user && open) {
      const loadSettings = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPushEnabled(data.settings?.pushEnabled ?? false);

          }
        } catch (e) {
          console.error('Failed to load user settings:', e);
        }
      };
      loadSettings();
    }
  }, [user, open]);

  const handleTogglePush = async (checked: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      if (checked) {
        const token = await requestNotificationPermission();
        if (token) {
          await saveFcmToken(user.uid, token);
          await setDoc(doc(db, 'users', user.uid), {
            settings: { pushEnabled: true }
          }, { merge: true });
          setPushEnabled(true);
          toast.success('Push-сповіщення активовано!');
        } else {
          toast.error('Не вдалося увімкнути сповіщення. Перевірте дозволи браузера.');
        }
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          settings: { pushEnabled: false }
        }, { merge: true });
        setPushEnabled(false);
        toast.info('Push-сповіщення вимкнено.');
      }
    } catch (e) {
      console.error('Error toggling push notifications:', e);
      toast.error('Помилка збереження налаштувань');
    } finally {
      setSaving(false);
    }
  };



  return (
    <>
      <Button
        variant="icon"
        size="md"
        id="settings-btn"
        onClick={() => setOpen(true)}
        title="Налаштування"
      >
        <Settings className="w-5 h-5" />
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Зовнішній вигляд"
      >
        {/* Mode Toggle */}
        <div className="mb-6">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <Sun className="w-3.5 h-3.5" />
            Режим теми
          </div>
          <div
            className="flex rounded-2xl p-1 gap-1"
            style={{ background: 'var(--t-surface-elevated)' }}
          >
            {([
              { key: 'light' as const, icon: <Sun className="w-4 h-4" />, label: 'Світла' },
              { key: 'dark' as const, icon: <Moon className="w-4 h-4" />, label: 'Темна' },
              { key: 'amoled' as const, icon: <Zap className="w-4 h-4" />, label: 'AMOLED' },
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
            Акцентний колір
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

        {/* Сповіщення (Notifications) */}
        <div className="mb-6 border-t pt-5" style={{ borderColor: 'var(--t-border-subtle)' }}>
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <Bell className="w-3.5 h-3.5" />
            Сповіщення
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-bold block" style={{ color: 'var(--t-text-primary)' }}>
                Push-сповіщення
              </span>
              <span className="text-[11px] font-medium block" style={{ color: 'var(--t-text-muted)' }}>
                Отримувати сповіщення на цьому пристрої
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={pushEnabled}
                disabled={saving}
                onChange={(e) => handleTogglePush(e.target.checked)}
              />
              <div 
                className="w-11 h-6 rounded-full relative transition-all"
                style={{
                  background: pushEnabled ? 'var(--t-accent-primary)' : 'var(--t-surface-elevated)',
                  border: '1px solid var(--t-border-default)'
                }}
              >
                <div 
                  className="absolute top-[2px] left-[2px] bg-white rounded-full transition-all"
                  style={{
                    width: '18px',
                    height: '18px',
                    transform: pushEnabled ? 'translateX(20px)' : 'translateX(0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </label>
          </div>


        </div>
      </BottomSheet>
    </>
  );
}
