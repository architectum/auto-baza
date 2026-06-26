import { useToast, ToastMessage } from '../context/ToastContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from '@shared/icons/Icons';


export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4"
      style={{
        bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 0.5rem)',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const { icon, bg, border, text, progressBg } = getToastStyles(toast.type);

  return (
    <div
      className="toast-item flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg backdrop-blur-md transition-all pointer-events-auto"
      style={{
        background: bg,
        borderColor: border,
        color: text,
      }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 text-sm font-medium leading-relaxed break-words">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors active:scale-95"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          color: 'inherit',
        }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function getToastStyles(type: string) {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--t-status-solution, #22c55e)' }} />,
        bg: 'var(--t-status-solution-bg, rgba(34,197,94,0.15))',
        border: 'color-mix(in srgb, var(--t-status-solution, #22c55e) 20%, transparent)',
        text: 'var(--t-status-solution, #22c55e)',
        progressBg: 'var(--t-status-solution, #22c55e)',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-5 h-5" style={{ color: 'var(--t-status-problem, #ff4444)' }} />,
        bg: 'var(--t-status-problem-bg, rgba(255,68,68,0.15))',
        border: 'color-mix(in srgb, var(--t-status-problem, #ff4444) 20%, transparent)',
        text: 'var(--t-status-problem, #ff4444)',
        progressBg: 'var(--t-status-problem, #ff4444)',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--t-status-note, #eab308)' }} />,
        bg: 'var(--t-status-note-bg, rgba(234,179,8,0.15))',
        border: 'color-mix(in srgb, var(--t-status-note, #eab308) 20%, transparent)',
        text: 'var(--t-status-note, #eab308)',
        progressBg: 'var(--t-status-note, #eab308)',
      };
    case 'info':
    default:
      return {
        icon: <Info className="w-5 h-5" style={{ color: 'var(--t-accent-primary, #6366f1)' }} />,
        bg: 'var(--t-surface-elevated, #2a2a3e)',
        border: 'var(--t-border-default, #333)',
        text: 'var(--t-text-primary, #eee)',
        progressBg: 'var(--t-accent-primary, #6366f1)',
      };
  }
}
