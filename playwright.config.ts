import { defineConfig } from '@playwright/test';

// Phase 9 owns the E2E suite. This config exists so `pnpm test:e2e` works from day one.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  // Locally, the running dev server is reused. In CI the built app runs
  // against the test database with the fake provider and a short minimum.
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  retries: process.env.CI ? 1 : 0,
  // The specs share one seeded user and its one active session. Never in parallel.
  workers: 1,
  fullyParallel: false,
});
