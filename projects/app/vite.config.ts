import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/` is the app root (src/). Kept in step with the same alias in
    // tsconfig.app.json — shadcn's vendored components import through it.
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
