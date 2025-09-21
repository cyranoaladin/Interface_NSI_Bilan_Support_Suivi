import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Ingestion RAG - upload PDF', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.getByLabel('Email').fill('pierre.caillabet@ert.tn');
  await page.getByLabel('Mot de passe').fill('password1234');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.getByText('Se connecter').click(),
  ]);
  // Si la page atterrit ailleurs, forcer l'accès après login
  await page.goto(`${BASE}/dashboard/teacher`);

  const filePath = path.resolve(process.cwd(), 'data', 'rag_sources', 'programme_nsi_terminale.pdf');
  if (fs.existsSync(filePath)) {
    const fileInput = page.locator('input[type="file"][name="file"]');
    await fileInput.setInputFiles(filePath);
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/rag/upload') && r.status() === 200),
      page.getByText('Uploader').click(),
    ]);
    expect(resp.ok()).toBeTruthy();
  } else {
    test.skip(true, 'Fichier programme_nsi_terminale.pdf introuvable');
  }
});
