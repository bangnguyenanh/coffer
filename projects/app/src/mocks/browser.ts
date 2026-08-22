/**
 * The MSW browser worker.
 *
 * Dev-only. Nothing outside `src/mocks/start.ts` imports this module, and that
 * module is reached only through a dynamic import behind `import.meta.env.DEV`,
 * so the whole mock layer is dead code in a production build and is dropped.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
