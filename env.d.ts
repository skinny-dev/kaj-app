/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_AUTO_DETECT?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_URL_LOCAL?: string;
  readonly VITE_API_URL_NETWORK?: string;
  readonly VITE_API_URL_PRODUCTION?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_WS_URL_LOCAL?: string;
  readonly VITE_WS_URL_NETWORK?: string;
  readonly VITE_WS_URL_PRODUCTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}