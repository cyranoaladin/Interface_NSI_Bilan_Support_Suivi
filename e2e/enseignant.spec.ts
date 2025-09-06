import { expect, test } from '@playwright/test';

test('Parcours enseignant complet', async ({ page }) => {
  // Connexion enseignant
  await page.goto('/nsi/login');
await page.getByPlaceholder(/email/i).fill('pierre.caillabet@ert.tn');
  await page.getByPlaceholder(/mot de passe/i).fill('password123');
  await page.getByText('Se connecter').click();

  // Si redirection vers change-password, changer et poursuivre
  if ((await page.url()).includes('change-password')) {
    await page.getByLabel('Nouveau mot de passe').fill('password1234');
    await page.getByText('Changer').click();
  }

// Aller au dashboard enseignant
  await page.goto('/nsi/dashboard/teacher');
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

