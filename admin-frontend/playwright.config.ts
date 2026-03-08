import { defineConfig, devices } from '@playwright/test';

const PORT = Number.parseInt(process.env.FRONTEND_PORT || '3003', 10);
const BASE_URL = `http://localhost:${PORT}`;
const USE_EXISTING_SERVER_IN_CI = process.env.CI === 'true';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: USE_EXISTING_SERVER_IN_CI
    ? undefined
    : {
        command: `npm run dev -- -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
