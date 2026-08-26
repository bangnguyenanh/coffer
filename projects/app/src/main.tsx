import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { readSeed, type Seed } from './data/seed';
import { AppDataProvider } from './state/AppDataProvider';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

/**
 * The app mounts SYNCHRONOUSLY. Nothing is awaited before the first paint —
 * there is no worker to register and no session to ask about (hub ticket 0003,
 * Owner directive 2026-08-25). The data is a JSON import and the auth state is
 * `useState`, so the first render already knows which screen to show.
 *
 * The one thing that can go wrong before rendering is a hand-edited fixture the
 * type checker cannot catch — an unknown `kind` in `accounts.json`; see
 * `src/data/seed.ts`. The Owner edits these files by hand, so that failure has
 * to SAY what it was: an uncaught throw here would leave `#root` empty, which is
 * indistinguishable from a broken build.
 */
let seed: Seed;
try {
  seed = readSeed();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  container.setAttribute('data-view', 'fixture-error');
  container.setAttribute('data-status', 'ready');
  container.textContent = reason;
  throw error;
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider seed={seed}>
          <App />
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
