import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary } from './shared/lib/errorBoundary';
import { ErrorProvider } from './shared/lib/errorContext';
import { AuthProvider } from './shared/context/AuthContext';
import { LanguageProvider } from './shared/i18n';
import { CurrencyProvider } from './shared/context/CurrencyContext';
import { ThemeProvider } from './components/ThemeProvider';
import { AppProvider } from './shared/context/AppContext';
import { ToastProvider } from './shared/context/ToastContext';
import { DialogProvider } from './shared/context/DialogContext';

import { RouterProvider } from 'react-router-dom';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ErrorProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <ThemeProvider>
                <ToastProvider>
                  <DialogProvider>
                    <AppProvider>
                      <RouterProvider router={router} />
                    </AppProvider>
                  </DialogProvider>
                </ToastProvider>
              </ThemeProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </ErrorProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
