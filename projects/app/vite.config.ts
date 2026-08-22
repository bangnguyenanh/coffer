import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const WORKER_URL = '/mockServiceWorker.js';
const WORKER_FILE = fileURLToPath(new URL('./dev-server/mockServiceWorker.js', import.meta.url));

/**
 * Serve the MSW service-worker script in development only.
 *
 * The script deliberately does NOT live in `public/`: anything in `public/` is
 * copied verbatim into `dist/`, and hub ticket 0003 requires the mock layer to
 * stay out of the production build. `apply: 'serve'` means this plugin does not
 * exist during `vite build`.
 */
function mswDevWorker(): Plugin {
  return {
    name: 'coffer:msw-dev-worker',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== WORKER_URL) return next();
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(readFileSync(WORKER_FILE));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mswDevWorker()],
});
