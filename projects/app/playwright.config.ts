import { defineConfig, devices } from '@playwright/test';

/**
 * The evidence loop, and the only one this surface has: Playwright driving the
 * real build. **Nobody builds a browser driver here** — see
 * `management/pm-playbook.md` and `.claude/agents/app.md`; this workspace has
 * already paid for that lesson once.
 *
 * It runs against `vite preview`, not the dev server: the dev server's
 * module-graph boot is slower and flakier under automation, and preview serves
 * exactly the bundle `npm run build` produced.
 *
 * The viewport is 1280 wide because that is the width theme C was drawn at
 * (`management/decisions/assets/0005-theme-c-ledger.html`).
 *
 * **`VIEWPORT` is declared once and applied INSIDE the project, after the device
 * spread — not above it.** `devices['Desktop Chrome']` carries its own
 * `viewport: { width: 1280, height: 720 }`, and a project's `use` wins over the
 * top-level `use` wholesale, so the height declared up here was silently
 * discarded: every screenshot this workspace took before 2026-08-27 is 1280x720,
 * whatever the config said. A config that lies about what it does is worse than
 * one that admits it.
 */
const VIEWPORT = { width: 1280, height: 900 } as const;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: VIEWPORT,
  },
  projects: [
    // The device spread FIRST, the viewport after it — otherwise Desktop
    // Chrome's own 1280x720 wins and the height above is decoration.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: VIEWPORT } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
