import React, { useState } from 'react';
import { haptic } from '../lib/haptic';
import { Button } from './Button';
import { Input } from './Input';

interface PromptDialogProps {
  title: string;
  message: string;
  defaultValue?: string;
  onClose: (value: string | null) => void;
}

export function PromptDialog({ title, message, defaultValue = '', onClose }: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    haptic.medium();
    onClose(value);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--t-surface-overlay, rgba(0,0,0,0.6))' }}>
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl animate-scale-in"
        style={{
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
        }}
      >
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--t-text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>
          {message}
        </p>
        <div className="mb-6">
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={() => {
              haptic.light();
              onClose(null);
            }}
          >
            Скасувати
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
          >
            Зберегти
          </Button>
        </div>
      </form>
    </div>
  );
}
