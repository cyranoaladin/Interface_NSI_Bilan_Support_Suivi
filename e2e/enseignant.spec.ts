import { expect, test } from '@playwright/test';
const BASE = process.env.BASE_URL || 'http://localhost:3000/nsi';

test('Parcours enseignant complet', async ({ page }) => {
  // Connexion enseignant
  await page.goto(`${BASE}/`);
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-test-mode': 'true' } as any;
    await route.continue({ headers });
  });
  await page.getByLabel('Email').fill('pierre.caillabet@ert.tn');
  await page.getByLabel('Mot de passe').fill('password123');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Si redirection vers change-password, changer et poursuivre
  if ((await page.url()).includes('change-password')) {
    await page.getByLabel('Nouveau mot de passe').fill('password1234');
    await page.getByRole('button', { name: 'Changer' }).click();
  }

  // Aller au dashboard enseignant (laissez la redirection si déjà effectuée)
  try {
    await page.waitForURL(/\/dashboard\/teacher/, { timeout: 8000 });
  } catch {
    await page.goto(`${BASE}/dashboard/teacher`);
  }
  await expect(page.locator('body')).toContainText('Espace Enseignant');
  // Groupes visibles et sélection
  await expect(page.locator('body')).toContainText('Mes Groupes');
  // Cliquer TEDS NSI si présent
  const teds = page.getByRole('button', { name: /TEDS NSI/i });
  if (await teds.isVisible()) await teds.click();

  // Table des élèves visible
  await expect(page.locator('body')).toContainText('Élèves');
  // Ouvrir bilans du premier élève si visible
  const voirBilans = page.getByRole('button', { name: /Voir bilans/i }).first();
  if (await voirBilans.isVisible()) {
    await voirBilans.click();
    await expect(page.locator('body')).toContainText('Bilans PDF');
    // Filtrer et actions
    const eleveBtn = page.getByRole('button', { name: 'Élève' });
    if (await eleveBtn.isVisible()) await eleveBtn.click();
    // Fermer modale
    await page.keyboard.press('Escape');
  }
});
