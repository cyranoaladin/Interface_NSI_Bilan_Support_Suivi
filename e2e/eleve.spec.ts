import { expect, test } from '@playwright/test';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Parcours élève — création via UI, soumission unique, redirection et verrouillage', async ({ page }) => {
  // Connexion (page d'accueil redirige élève vers /bilan/initier)
  await page.goto(`${BASE}/`);
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-test-mode': 'true' } as any;
    await route.continue({ headers });
  });
  // Sur la page d’accueil, les champs utilisent des labels visibles
  await page.getByLabel('Email').fill('aziz.acheb-e@ert.tn');
  await page.getByLabel('Mot de passe').fill('password123');
  async function doLogin(): Promise<Response> {
    const loginResp = page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    return await loginResp;
  }
  let lr = await doLogin();
  for (let attempt = 1; attempt <= 2 && (!lr.ok() && lr.status() >= 500); attempt++) {
    await page.waitForTimeout(800 * attempt);
    await page.getByLabel('Email').fill('aziz.acheb-e@ert.tn');
    await page.getByLabel('Mot de passe').fill('password123');
    lr = await doLogin();
  }
  if (!lr.ok()) {
    const body = await lr.text().catch(() => '');
    throw new Error(`Login failed: status=${lr.status()} body=${body}`);
  }
  // Attendre redirection déclenchée par la page d'accueil
  let redirected = false;
  try {
    await page.waitForURL(new RegExp(`${BASE}/change-password`), { timeout: 8000 });
    await page.getByPlaceholder('Nouveau mot de passe').fill('Password#2025');
    await page.getByRole('button', { name: 'Changer' }).click();
    redirected = true;
  } catch {}
  if (!redirected) {
    try { await page.waitForURL(new RegExp(`${BASE}/bilan/initier`), { timeout: 8000 }); redirected = true; } catch {}
  }
  if (!redirected) {
    await page.goto(`${BASE}/bilan/initier`);
  }

  // Parcours UI: aller sur la page d'initiation et cliquer sur "Créer le bilan"
  await page.goto(`${BASE}/bilan/initier`);
  const createResp = page.waitForResponse(r => r.url().includes('/api/bilan/create') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Créer le bilan/i }).click();
  // Essayer de capturer la requête de navigation vers le questionnaire et s'y rendre explicitement
  let navigated = false;
  try {
    const navReq = await page.waitForRequest(req => /\/bilan\/.+\/questionnaire/.test(new URL(req.url()).pathname), { timeout: 15000 });
    const u = new URL(navReq.url());
    await page.goto(`${u.origin}${u.pathname}`);
    navigated = true;
  } catch {}
  if (!navigated) {
    // Dernière tentative: attendre l'URL finale si la page a déjà redirigé
    await page.waitForURL(/\/bilan\/[^/]+\/questionnaire/, { timeout: 30000 });
  }
  // Extraire bilanId courant pour revenir après soumission
  const currentUrl = new URL(await page.url());
  const m = currentUrl.pathname.match(/bilan\/([^/]+)\/questionnaire/);
  const bilanId = m ? m[1] : '';

  // Saisir quelques réponses minimales si formulaire visible (radio/checkbox/short)
  const firstRadio = page.locator('input[type="radio"]').first();
  if (await firstRadio.isVisible()) await firstRadio.check();
  const firstShort = page.locator('input[type="text"]').first();
  if (await firstShort.isVisible()) await firstShort.fill('Réponse courte');

  // Soumettre
  const submit = page.getByRole('button', { name: /Soumettre/i });
  await submit.click();

  // Redirection automatique vers le dashboard élève (avec ou sans basePath /nsi)
  await expect(page).toHaveURL(/\/dashboard\/student$/);

  // Revenir sur la page questionnaire du bilan soumis via l'URL directe
  if (bilanId) {
    await page.goto(`${BASE}/bilan/${bilanId}/questionnaire`);
  }

  // La page doit afficher un message d’information et désactiver le bouton Soumettre
  await expect(page.locator('body')).toContainText(/Déjà soumis|complété|Déjà complété/i);
  await expect(page.getByRole('button', { name: /Soumettre/i })).toBeDisabled();
});
