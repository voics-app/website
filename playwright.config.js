import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: 'output/playwright',
  use: { baseURL: 'http://127.0.0.1:28805', headless: true },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'node scripts/serve-test.mjs', url: 'http://127.0.0.1:28805', reuseExistingServer: false },
});
