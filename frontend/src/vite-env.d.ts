/// <reference types="vite/client" />

/** Injected by vite.config `define` — true on Vercel CI and when VITE_RELATIVE_API=1. */
declare const __USE_RELATIVE_API__: boolean;

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_DEV_PORT?: string;
  readonly VITE_RELATIVE_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
