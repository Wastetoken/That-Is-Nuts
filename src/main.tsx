import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Intercept unhandled promise rejections (e.g. browser audio autoplay or vibration policy rejections)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Silence benign audio or gesture restriction rejections
    if (
      event.reason &&
      (typeof event.reason === 'string' || event.reason.message) &&
      (String(event.reason.message || event.reason).includes('AudioContext') ||
       String(event.reason.message || event.reason).includes('user gesture') ||
       String(event.reason.message || event.reason).includes('vibrate'))
    ) {
      event.preventDefault();
      return;
    }
    console.warn('Captured async rejection:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

