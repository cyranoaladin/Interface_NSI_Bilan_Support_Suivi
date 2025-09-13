import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Ingestion RAG - upload PDF', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.getByLabel('Email').fill('pierre.caillabet@ert.tn');
  await page.getByLabel('Mot de passe').fill('password1234');
  await page.getByText('Se connecter').click();
  await page.goto(`${BASE}/dashboard/teacher`);

  // Uploader un fichier (si champ disponible)
  const filePath = path.resolve(process.cwd(), 'programme_nsi_terminale.pdf');
  if (fs.existsSync(filePath)) {
    const fileInput = page.locator('input[type="file"][name="file"]');
    await fileInput.setInputFiles(filePath);
    await page.getByText('Uploader').click();
    // Optionnel: vérifier un feedback
    // await expect(page.getByText(/upload/i)).toBeVisible();
  } else {
    test.skip(true, 'Fichier programme_nsi_terminale.pdf introuvable');
  }
});
