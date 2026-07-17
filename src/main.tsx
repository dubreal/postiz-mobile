import '@fontsource-variable/plus-jakarta-sans';
import './styles/index.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { loadConfig } from './lib/config';
import { applyTheme, getTheme } from './lib/theme';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';

applyTheme(getTheme());

// Load runtime config (storage provider) before first paint so the uploader
// knows which path to use.
void loadConfig().finally(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
