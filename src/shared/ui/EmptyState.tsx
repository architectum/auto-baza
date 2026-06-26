import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 animate-fade-in ${className}`}>
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner"
        style={{ background: 'var(--t-accent-primary-muted)' }}
      >
        <span style={{ color: 'var(--t-accent-primary)', opacity: 0.8 }}>
          {icon}
        </span>
      </div>
      <p
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--t-text-primary)' }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-sm font-medium mb-6 max-w-xs mx-auto"
          style={{ color: 'var(--t-text-muted)' }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          icon={actionIcon}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
