import '@fontsource-variable/plus-jakarta-sans';
import './styles/index.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { loadConfig } from './lib/config';
import { applyTheme, getTheme } from './lib/theme';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';

applyTheme(getTheme());

// A single catch-all data route wraps the existing <Routes> tree. Using a data
// router (createBrowserRouter) is what enables useBlocker for the unsaved-changes
// guard in Compose.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
  },
]);

// Load runtime config (storage provider) before first paint so the uploader
// knows which path to use.
void loadConfig().finally(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
