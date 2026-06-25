import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { LedgerProvider } from './app/store';
import { DialogProvider } from './ui/Dialog';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <LedgerProvider>
        <App />
      </LedgerProvider>
    </DialogProvider>
  </StrictMode>,
);
