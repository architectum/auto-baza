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
import { useAuth } from '@shared/context/AuthContext';
import { requestNotificationPermission, saveFcmToken } from '@services/notifications';

export default function App() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showOnlinePill, setShowOnlinePill] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

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
          toast.success(`Синхронізовано ${count} офлайн-файлів`);
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
  }, [isOnline, wasOffline, toast]);

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      const shown = sessionStorage.getItem('fcm_prompt_shown');
      if (shown !== 'true') {
        const timer = setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Auto-refresh and save FCM token on startup if permission is already granted
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'granted') {
      const refreshFcmToken = async () => {
        try {
          const token = await requestNotificationPermission();
          if (token) {
            await saveFcmToken(user.uid, token);
            console.log("FCM token successfully refreshed and saved on app load.");
          }
        } catch (err) {
          console.error("Failed to refresh FCM token on app load:", err);
        }
      };
      refreshFcmToken();
    }
  }, [user]);

  const handleEnableNotifications = async () => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('fcm_prompt_shown', 'true');
    const token = await requestNotificationPermission();
    if (token && user) {
      await saveFcmToken(user.uid, token);
      toast.success('Push-сповіщення успішно активовано!');
    }
  };

  const handleDeclineNotifications = () => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('fcm_prompt_shown', 'true');
  };

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
            <span>Офлайн-режим</span>
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
            <span>З'єднання відновлено</span>
          </div>
        )}

        {/* Notification Opt-in Prompt Banner */}
        {showNotificationPrompt && (
          <div 
            className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-[90] p-4 rounded-2xl border shadow-2xl animate-fade-in-up flex flex-col gap-3"
            style={{ 
              background: 'var(--t-surface-card)', 
              borderColor: 'var(--t-border-default)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex gap-3">
              <span className="text-xl">🔔</span>
              <div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Push-сповіщення</h4>
                <p className="text-xs font-medium mt-1 leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>
                  Бажаєте отримувати нагадування про незакриті проблеми автомобілів та планове обслуговування?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-1">
              <button 
                onClick={handleDeclineNotifications}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer"
                style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
              >
                Пізніше
              </button>
              <button 
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer t-accent-gradient text-white"
              >
                Увімкнути
              </button>
            </div>
          </div>
        )}

        <Outlet />
        <ScrollRestoration />
      </div>
    </AuthLayer>
  );
}
