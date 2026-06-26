import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties & { className: string }> = {
  sm: {
    className: 'text-xs font-semibold gap-1.5',
    padding: '0.5rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    minHeight: '2rem',
  },
  md: {
    className: 'text-sm font-semibold gap-2',
    padding: '0.625rem 1.125rem',
    borderRadius: 'var(--radius-md)',
    minHeight: '2.5rem',
  },
  lg: {
    className: 'text-base font-semibold gap-2.5',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-lg)',
    minHeight: '3rem',
  },
};

const iconSizeStyles: Record<ButtonSize, React.CSSProperties & { className: string }> = {
  sm: {
    className: '',
    width: '2rem',
    height: '2rem',
    borderRadius: 'var(--radius-md)',
  },
  md: {
    className: '',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: 'var(--radius-md)',
  },
  lg: {
    className: '',
    width: '3rem',
    height: '3rem',
    borderRadius: 'var(--radius-lg)',
  },
};

function getVariantStyles(variant: ButtonVariant, disabled: boolean): React.CSSProperties {
  const opacity = disabled ? 0.5 : 1;

  switch (variant) {
    case 'primary':
      return {
        background: 'var(--t-accent-primary)',
        color: 'var(--t-text-on-accent)',
        border: 'none',
        opacity,
      };
    case 'secondary':
      return {
        background: 'var(--t-surface-elevated)',
        color: 'var(--t-text-primary)',
        border: '1px solid var(--t-border-default)',
        opacity,
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--t-text-secondary)',
        border: 'none',
        opacity,
      };
    case 'danger':
      return {
        background: 'var(--t-status-problem-bg)',
        color: 'var(--t-status-problem)',
        border: 'none',
        opacity,
      };
    case 'icon':
      return {
        background: 'var(--t-surface-elevated)',
        color: 'var(--t-text-secondary)',
        border: 'none',
        opacity,
      };
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isIconOnly = variant === 'icon';
  const sizeConfig = isIconOnly ? iconSizeStyles[size] : sizeStyles[size];
  const variantStyle = getVariantStyles(variant, isDisabled);

  const { className: sizeClassName, ...sizeStyle } = sizeConfig;

  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-all active:scale-[0.97]
        cursor-pointer
        ${sizeClassName}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'pointer-events-none' : ''}
        ${className}
      `.trim()}
      style={{
        ...sizeStyle,
        ...variantStyle,
        ...(isIconOnly ? { padding: 0 } : {}),
        ...style,
      }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
        </svg>
      ) : (
        <>
          {icon && <span className="shrink-0 flex items-center">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
