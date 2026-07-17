import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The SPA is served at the site root by Caddy; `/api` and `/uploads` are
// reverse-proxied to the host's Postiz on the SAME origin, so no dev CORS.
// For local dev against a remote Postiz, set POSTIZ_UPSTREAM and use the proxy below.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: process.env.POSTIZ_UPSTREAM
      ? {
          '/api': { target: process.env.POSTIZ_UPSTREAM, changeOrigin: false },
          '/uploads': { target: process.env.POSTIZ_UPSTREAM, changeOrigin: false },
        }
      : undefined,
  },
  build: { outDir: 'dist', sourcemap: false },
});
