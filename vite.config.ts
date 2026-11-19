import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from https://fudgegrass.github.io/Castle/
export default defineConfig({
  base: '/Castle/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Castle',
        short_name: 'Castle',
        description: 'Your personal assistant',
        theme_color: '#2a1d14',
        background_color: '#f4ead5',
        display: 'standalone',
        start_url: '/Castle/',
        scope: '/Castle/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only cache the app itself. Google and Claude responses are never cached.
        navigateFallback: '/Castle/index.html',
        runtimeCaching: [],
      },
    }),
  ],
});
