import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration for Invoice Generator
 * @see https://playwright.dev/docs/test-configuration
 *
 * E2E Testing Setup:
 *
 * For local development:
 * 1. Start the dev server with E2E bypass: `pnpm dev:e2e`
 * 2. Run tests: `pnpm test:e2e`
 *
 * For CI:
 * - Tests will automatically start the server with E2E_TESTING=true
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3005',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'E2E_TESTING=true pnpm dev',
    url: 'http://localhost:3005',
    /* In local dev, reuse existing server (must be started with pnpm dev:e2e) */
    /* In CI, start fresh server with E2E_TESTING=true */
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      E2E_TESTING: 'true',
    },
  },
})
