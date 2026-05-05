import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary, ErrorProvider } from './components/ErrorModal';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ErrorProvider>
        <App />
      </ErrorProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
