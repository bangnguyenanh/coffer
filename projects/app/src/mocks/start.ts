/**
 * Dev-only entry point for the mock network layer.
 *
 * The service worker script is NOT in `public/`: it is served by a
 * `apply: 'serve'` Vite plugin (see vite.config.ts) so it cannot be copied into
 * `dist/`. `msw` itself is a devDependency reached only from here.
 */

export async function startMockNetwork(): Promise<void> {
  const { worker } = await import('./browser');
  await worker.start({
    // Anything the handlers do not claim (the Vite client, HMR, assets) goes to
    // the real network untouched and without a console warning.
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: false,
  });
}
