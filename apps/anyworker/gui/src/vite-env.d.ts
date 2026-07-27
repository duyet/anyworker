/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANYWORKER_HTTP?: string;
  readonly VITE_ANYWORKER_WS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
