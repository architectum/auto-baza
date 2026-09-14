/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AuthLayer } from '@features/auth/AuthLayer';
import { useOnlineStatus } from '@shared/hooks';
import { OfflineIcon, Check } from '@shared/icons/Icons';
import { syncOfflineQueue } from '@services/offlineQueue';
import { useToast } from '@shared/context/ToastContext';
import { useLanguage } from '@shared/i18n';

export default function App() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showOnlinePill, setShowOnlinePill] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(err => {
        console.warn("Failed to clear app badge:", err);
      });
    }
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlinePill(false);
    } else if (isOnline && wasOffline) {
      setShowOnlinePill(true);
      
      // Automatically sync offline queue on reconnection
      syncOfflineQueue(msg => toast.info(msg)).then(count => {
        if (count > 0) {
          toast.success(t('common.syncOfflineFiles', { count }));
        }
      }).catch(err => {
        console.error("Offline queue sync failed:", err);
      });

      const timer = setTimeout(() => {
        setShowOnlinePill(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, toast, t]);

  return (
    <AuthLayer>
      <div className="min-h-dvh" style={{ background: 'var(--t-surface-bg)', color: 'var(--t-text-primary)' }}>
        {/* Offline Pill */}
        {!isOnline && (
          <div 
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-semibold shadow-lg animate-fade-in"
            style={{ 
              background: 'var(--t-status-problem-bg)', 
              color: 'var(--t-status-problem)', 
              borderColor: 'var(--t-status-problem)' 
            }}
          >
            <OfflineIcon className="w-4.5 h-4.5" />
            <span>{t('common.offlineMode')}</span>
          </div>
        )}

        {/* Online/Reconnected Pill */}
        {showOnlinePill && (
          <div 
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-semibold shadow-lg animate-fade-in"
            style={{ 
              background: 'var(--t-status-solution-bg)', 
              color: 'var(--t-status-solution)', 
              borderColor: 'var(--t-status-solution)' 
            }}
          >
            <Check className="w-4.5 h-4.5" />
            <span>{t('common.connectionRestored')}</span>
          </div>
        )}

        <Outlet />
        <ScrollRestoration />
      </div>
    </AuthLayer>
  );
}
