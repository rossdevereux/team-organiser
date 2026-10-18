import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from root package.json or client package.json with fallback
let appVersion = '1.0.0';
try {
  const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
  appVersion = rootPkg.version || '1.0.0';
} catch {
  try {
    const clientPkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
    appVersion = clientPkg.version || '1.0.0';
  } catch {
    appVersion = '1.0.0';
  }
}

if (process.env.VITE_APP_VERSION) {
  appVersion = process.env.VITE_APP_VERSION;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase/')) {
            return 'firebase';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'tanstack';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-icons';
          }
          if (
            id.includes('node_modules/react-markdown/') ||
            id.includes('node_modules/remark-gfm/') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/unist') ||
            id.includes('node_modules/mdast')
          ) {
            return 'markdown-vendor';
          }
          if (id.includes('node_modules/i18next')) {
            return 'i18n-vendor';
          }
        },
      },
    },
  },
});
