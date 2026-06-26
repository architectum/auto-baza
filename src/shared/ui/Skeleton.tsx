import React from 'react';

export function CarCardSkeleton() {
  return (
    <div 
      className="rounded-2xl p-5 border relative overflow-hidden skeleton-pulse mb-4" 
      style={{ 
        background: 'var(--t-surface-card, #1a1a2e)', 
        borderColor: 'var(--t-border-default, #333)',
        boxShadow: '0 16px 36px -28px rgba(0,0,0,0.45)' 
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
      
      {/* Image Placeholder */}
      <div 
        className="w-full h-44 rounded-xl mb-4" 
        style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }}
      />

      <div className="flex gap-4 mb-5">
        <div className="flex-1 min-w-0">
          {/* Title Placeholder */}
          <div 
            className="h-8 w-2/3 rounded-lg mb-3" 
            style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }}
          />
          {/* Pills Placeholder */}
          <div className="flex gap-2">
            <div className="h-7 w-12 rounded-lg" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
            <div className="h-7 w-20 rounded-lg" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
            <div className="h-7 w-16 rounded-lg" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
          </div>
        </div>
        
        {/* Avatar Placeholder */}
        <div 
          className="w-16 h-16 rounded-full shrink-0" 
          style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }}
        />
      </div>

      {/* Owner Info Placeholder */}
      <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--t-border-default, #333)' }}>
        <div className="h-5 w-1/2 rounded" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
        <div className="h-5 w-8 rounded-full" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
      </div>
    </div>
  );
}

export function CarProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto skeleton-pulse" style={{ background: 'var(--t-surface-bg, #0f0f1a)' }}>
      {/* Top Bar */}
      <header className="px-3 py-3 border-b flex items-center justify-between animate-pulse" style={{ borderColor: 'var(--t-border-default, #333)' }}>
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
        <div className="h-6 w-24 rounded" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
      </header>

      {/* Main Content */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Card skeleton */}
        <div className="rounded-2xl p-5 border h-60" style={{ background: 'var(--t-surface-card, #1a1a2e)', borderColor: 'var(--t-border-default, #333)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-4" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
          <div className="h-7 w-1/2 rounded mx-auto mb-3" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
          <div className="h-5 w-1/3 rounded mx-auto" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
        </div>

        {/* History timeline skeleton */}
        <div className="flex-1 flex flex-col gap-3 mt-4">
          <div className="h-5 w-1/4 rounded" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className="rounded-xl border p-4 h-24 flex items-center justify-between" 
              style={{ background: 'var(--t-surface-card, #1a1a2e)', borderColor: 'var(--t-border-default, #333)' }}
            >
              <div className="flex-1">
                <div className="h-5 w-1/3 rounded mb-2" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
                <div className="h-4 w-2/3 rounded" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
              </div>
              <div className="w-10 h-10 rounded-full" style={{ background: 'var(--t-surface-elevated, #2a2a3e)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
