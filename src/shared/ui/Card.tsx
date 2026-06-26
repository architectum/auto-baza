import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  id?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  children,
  className = '',
  style,
  onClick,
  id,
  padding = 'md',
  interactive = false,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      id={id}
      onClick={onClick}
      className={`
        rounded-2xl border overflow-hidden
        ${paddingMap[padding]}
        ${interactive || onClick ? 'transition-all active:scale-[0.98] cursor-pointer' : ''}
        ${className}
      `.trim()}
      style={{
        background: 'var(--t-surface-card)',
        borderColor: 'var(--t-border-default)',
        boxShadow: 'var(--shadow-card)',
        textAlign: onClick ? 'left' as const : undefined,
        width: onClick ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '', style }: CardHeaderProps) {
  return (
    <div
      className={`px-4 pt-4 pb-2 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', style }: CardBodyProps) {
  return (
    <div
      className={`px-4 py-2 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', style }: CardFooterProps) {
  return (
    <div
      className={`px-4 pt-2 pb-4 border-t ${className}`}
      style={{
        borderColor: 'var(--t-border-subtle)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
