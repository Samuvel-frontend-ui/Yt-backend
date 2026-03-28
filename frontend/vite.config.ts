import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/** Local API: `cd ../backend && pip install -r requirements.txt && uvicorn main:app --port 8000` */
const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

/** Vercel sets `VERCEL=1` during build (all domains). Enables same-origin `/api` → edge rewrite to Render. */
const useRelativeApi =
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  process.env.VITE_RELATIVE_API === '1';

export default defineConfig(() => {
  return {
    define: {
      __USE_RELATIVE_API__: JSON.stringify(useRelativeApi),
    },
    /** Load optional `.env` for dev (`VITE_BACKEND_URL`, etc.). */
    envDir: path.resolve(__dirname),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: Number(process.env.VITE_DEV_PORT) || 3000,
      strictPort: false,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          /** video-info can take 15–60s; explicit ms avoids ECONNRESET with some http-proxy defaults */
          timeout: 180_000,
          proxyTimeout: 180_000,
        },
      },
    },
  };
});
