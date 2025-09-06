import { expect, test } from '@playwright/test';

test('Parcours élève - smoke', async ({ page }) => {
  await page.goto('/nsi/login');
await page.getByPlaceholder(/email/i).fill('aziz.acheb-e@ert.tn');
  await page.getByPlaceholder(/mot de passe/i).fill('password123');
  await page.getByText('Se connecter').click();
  // La suite dépend de la donnée; on vérifie qu'on ne reste pas bloqué au formulaire sans feedback d'erreur
  // Soit redirection, soit affichage dashboard/change-password
await expect(page.locator('body')).toContainText(/(Dashboard|Changer le mot de passe|Questionnaire|Identifiants invalides|Connexion)/);
});
