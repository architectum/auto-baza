import React from 'react';

interface ChartCardProps {
  gradient: string;
  children: React.ReactNode;
}

export function ChartCard({ gradient, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border p-5 relative overflow-hidden animate-fade-in" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: gradient }} />
      {children}
    </section>
  );
}
