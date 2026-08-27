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
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
