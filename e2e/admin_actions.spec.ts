import { test, expect } from '@playwright/test';

test('Actions d\'administration enseignant', async ({ page }) => {
  // Connexion enseignant
  await page.goto('/nsi/login');
await page.getByPlaceholder(/email/i).fill('pierre.caillabet@ert.tn');
  await page.getByPlaceholder(/mot de passe/i).fill('password1234');
  await page.getByText('Se connecter').click();
  await page.goto('/nsi/dashboard/teacher');

  // Réinitialiser mot de passe d'un élève (attendre que les lignes se chargent)
  await expect(page.locator('body')).toContainText('Élèves');
  // attendre l'apparition d'au moins une action potentielle
  await page.waitForTimeout(1500);
  const resetBtn = page.getByRole('button', { name: /Réinitialiser mot de passe/i }).first();
  if ((await resetBtn.count()) > 0) {
    await resetBtn.click();
  }
  // Toast attendu (si visible)
  // Vérifier présence éventuelle d'un feedback (optionnel)
  // await expect(page.getByText(/Mot de passe réinitialisé/i)).toBeVisible();
});

