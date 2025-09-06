import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
});

