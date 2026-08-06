import { defineConfig, devices } from '@playwright/test';

const fullBrowserMatrix = process.env.FULL_BROWSER_MATRIX === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npm --prefix server run start:test',
      url: 'http://127.0.0.1:5001/livez',
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    },
    {
      command: 'npm --prefix client run dev:test',
      url: 'http://127.0.0.1:5174/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(fullBrowserMatrix ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
      { name: 'mobile-webkit', use: { ...devices['iPhone 15'] } }
    ] : [])
  ]
});
