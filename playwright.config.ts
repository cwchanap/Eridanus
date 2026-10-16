import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // The two long release journeys are independent (per-test browser
  // context and cleared localStorage), so they run on separate workers
  // instead of serially doubling the deploy-gating job time.
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'bun run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
