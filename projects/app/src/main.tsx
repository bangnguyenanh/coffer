import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

/**
 * In development the app talks to the MSW mock network (hub ticket 0003 phase
 * 1). The worker is started BEFORE the first render so no request escapes
 * unmocked during mount.
 *
 * `import.meta.env.DEV` is statically replaced at build time, so in a
 * production build this branch — and the dynamic import inside it — is dead
 * code and never reaches the bundle.
 */
async function bootstrap(root: HTMLElement): Promise<void> {
  if (import.meta.env.DEV) {
    const { startMockNetwork } = await import('./mocks/start');
    await startMockNetwork();
  }

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap(container);
