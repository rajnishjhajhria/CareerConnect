import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // allow access from network / preview proxy
    port: 5173,
    allowedHosts: true, // allow the hosted preview domain (dev only)
    proxy: {
      // Forward /api/* calls to Express during development,
      // so the React app can simply call fetch('/api/...')
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
