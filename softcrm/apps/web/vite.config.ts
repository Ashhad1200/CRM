import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Inside Docker the API lives at http://api:4000; outside at http://localhost:4000
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: process.env.VITE_HOST ?? 'localhost',
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime - rarely changes
          vendor: ['react', 'react-dom', 'react-router'],
          // Data fetching - changes with API updates
          query: ['@tanstack/react-query'],
          // Internationalization - stable
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // State management - stable
          state: ['zustand'],
          // Real-time - stable
          socket: ['socket.io-client'],
        },
      },
    },
  },
});
