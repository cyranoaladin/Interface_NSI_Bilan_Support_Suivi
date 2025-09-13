import { defineConfig } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  outputDir: './e2e-out',
  use: {
    baseURL: BASE,
    headless: true,
  },
  // On suppose que le serveur est déjà lancé via Docker Compose
  // et accessible sur BASE_URL. On n'utilise pas webServer ici.
});
