/// <reference types="vite/client" />

// Augment ImportMetaEnv với biến môi trường dự án (giữ nguyên từ bản cũ).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
