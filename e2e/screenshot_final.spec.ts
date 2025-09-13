import { test } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Capture unique avec PY-B-04, PY-B-07, ST-A-01 (full page)', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-test-mode': 'true' } as any;
    await route.continue({ headers });
  });
  await page.getByLabel('Email').fill('aziz.acheb-e@ert.tn');
  await page.getByLabel('Mot de passe').fill('password123');
  async function doLogin(): Promise<Response> {
    const loginResp = page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    return await loginResp;
  }
  let lr = await doLogin();
  for (let attempt = 1; attempt <= 3 && (!lr.ok() && lr.status() >= 500); attempt++) {
    await page.waitForTimeout(800 * attempt);
    await page.getByLabel('Email').fill('aziz.acheb-e@ert.tn');
    await page.getByLabel('Mot de passe').fill('password123');
    lr = await doLogin();
  }
  if (!lr.ok()) throw new Error(`Login failed: status=${lr.status()}`);

  // Aller sur initier et attendre la première réponse bilanc create avant d'attendre l'URL
  await page.goto(`${BASE}/bilan/initier`);
  const createRespPromise = page.waitForResponse(r => r.url().includes('/api/bilan/create') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Créer le bilan/i }).click();
  const createResp = await createRespPromise;
  let bilanId = '';
  try {
    const data: any = await createResp.json();
    bilanId = data?.bilanId || data?.bilan?.id || '';
  } catch {}
  if (bilanId) {
    await page.goto(`${BASE}/bilan/${bilanId}/questionnaire`);
  } else {
    // fallback: intercepter la première requête vers /bilan/.../questionnaire et y naviguer
    try {
      const navReq = await page.waitForRequest(req => /\/bilan\/[^/]+\/questionnaire/.test(new URL(req.url()).pathname), { timeout: 15000 });
      const u = new URL(navReq.url());
      await page.goto(`${u.origin}${u.pathname}`);
    } catch {
      await page.waitForURL(/\/bilan\/[^/]+\/questionnaire/);
    }
  }

  // Attendre la fin des requêtes puis capturer toute la page (les items sont tous rendus)
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'docs/artifacts_premium_new/pyb04_pyb07_sta01_ui.png', fullPage: true });
});
