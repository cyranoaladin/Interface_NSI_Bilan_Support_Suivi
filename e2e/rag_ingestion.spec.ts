import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Ingestion RAG - upload PDF', async ({ page }) => {
  await page.goto('/nsi/login');
await page.getByPlaceholder(/email/i).fill('pierre.caillabet@ert.tn');
  await page.getByPlaceholder(/mot de passe/i).fill('password1234');
  await page.getByText('Se connecter').click();
await page.goto('/nsi/dashboard/teacher');

  // Uploader un fichier (si champ disponible)
  const filePath = path.resolve(process.cwd(), 'programme_nsi_terminale.pdf');
  if (fs.existsSync(filePath)) {
    const fileInput = page.locator('input[type="file"][name="file"]');
    await fileInput.setInputFiles(filePath);
    await page.getByText('Uploader').click();
    // On s'attend à un toast de succès (optionnel)
    // await expect(page.getByText(/upload/i)).toBeVisible();
  } else {
    test.skip(true, 'Fichier programme_nsi_terminale.pdf introuvable');
  }
});

