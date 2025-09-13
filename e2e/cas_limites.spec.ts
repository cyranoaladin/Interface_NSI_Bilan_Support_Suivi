import { expect, test } from '@playwright/test';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Cas limites et sécurité', async ({ page }) => {
  // Auth: email inconnu
  await page.goto(`${BASE}/`);
  await page.getByLabel('Email').fill('unknown@ert.tn');
  await page.getByLabel('Mot de passe').fill('wrong');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.locator('body')).toContainText(/(invalides|Connexion)/);

  // Permissions: accès dashboard enseignant en étant déconnecté
  await page.goto(`${BASE}/dashboard/teacher`);
  await expect(page).toHaveURL(/dashboard\/teacher/);
});
