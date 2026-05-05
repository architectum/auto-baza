import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary, ErrorProvider } from './components/ErrorModal';
import { PinLockProvider } from './components/PinLock';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ErrorProvider>
        <PinLockProvider>
          <App />
        </PinLockProvider>
      </ErrorProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
