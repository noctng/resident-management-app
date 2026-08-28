// Fix: Add explicit type definitions for import.meta.env to resolve TypeScript errors.
// This ensures that TypeScript recognizes `import.meta.env`.
// API calls now use relative paths proxied by Vite, so VITE_API_URL is no longer needed.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
