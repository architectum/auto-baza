import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@shared/icons/Icons';


interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function PageHeader({ title, onBack, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = `${title} | АвтоБаза`;
  }, [title]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-30 safe-top glass border-b" style={{ background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)', borderColor: 'var(--t-border-default)' }}>
      <div className="flex items-center justify-between px-3 py-3 gap-3 max-w-lg mx-auto w-full">
        <button 
          onClick={handleBack} 
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0 animate-fade-in"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold tracking-tight truncate flex-1 text-center" style={{ color: 'var(--t-text-primary)' }}>
          {title}
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
        </div>
      </div>
    </header>
  );
}
