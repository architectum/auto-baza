import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'mileage' | 'note';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function getVariantStyles(variant: BadgeVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--t-accent-primary-muted)',
        color: 'var(--t-text-accent)',
      };
    case 'success':
      return {
        background: 'var(--t-status-solution-bg)',
        color: 'var(--t-status-solution)',
      };
    case 'warning':
      return {
        background: 'var(--status-reminder-bg)',
        color: 'var(--status-reminder)',
      };
    case 'danger':
      return {
        background: 'var(--t-status-problem-bg)',
        color: 'var(--t-status-problem)',
      };
    case 'info':
      return {
        background: 'var(--t-status-note-bg)',
        color: 'var(--t-status-note)',
      };
    case 'mileage':
      return {
        background: 'var(--t-status-mileage-bg)',
        color: 'var(--t-status-mileage)',
      };
    case 'note':
      return {
        background: 'var(--t-status-note-bg)',
        color: 'var(--t-status-note)',
      };
    default:
      return {
        background: 'var(--t-surface-elevated)',
        color: 'var(--t-text-secondary)',
      };
  }
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
  style,
}: BadgeProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center font-bold rounded-lg
        ${sizeClasses}
        ${className}
      `.trim()}
      style={{
        ...variantStyles,
        ...style,
      }}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      {children}
    </span>
  );
}
