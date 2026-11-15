import { defineConfig } from '@playwright/test';
const baseURL = `http://127.0.0.1:${process.env.PORT || 3000}`;
export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.PW_CHANNEL,
  },
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
