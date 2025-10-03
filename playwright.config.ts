import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './',
  timeout: 60_000,
  outputDir: 'test-results-run',
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
  projects: [
    { name: 'root-e2e', testDir: './e2e' },
    { name: 'web-e2e', testDir: './apps/web/tests/e2e' },
  ],
});
