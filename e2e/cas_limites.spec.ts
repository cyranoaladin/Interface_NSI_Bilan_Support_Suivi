import { expect, test } from '@playwright/test';

test('Cas limites et sécurité', async ({ page }) => {
  // Auth: email inconnu
  await page.goto('/nsi/login');
await page.getByPlaceholder(/email/i).fill('unknown@ert.tn');
  await page.getByPlaceholder(/mot de passe/i).fill('wrong');
  await page.getByText('Se connecter').click();
await expect(page.locator('body')).toContainText(/(invalides|Connexion)/);

// Permissions: accès dashboard enseignant en étant déconnecté
  await page.goto('/nsi/dashboard/teacher');
  await expect(page).toHaveURL(/dashboard\/teacher/);
});

