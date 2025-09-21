// @ts-nocheck
import fetch, { Headers } from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
const STUDENT_PASS = process.env.E2E_STUDENT_PASS || 'password123';
const BILAN_ID = process.env.BILAN_ID || '';

if (!BILAN_ID) {
  console.error('[CHECK] Missing BILAN_ID env');
  process.exit(2);
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function loginStudent() {
  const headers: any = { 'content-type': 'application/json', 'x-test-mode': 'true' };
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASS }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Login failed: ' + r.status + ' ' + JSON.stringify(j));
  const setCookie = r.headers.get('set-cookie') || '';
  const cookie = (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
  return { cookie };
}

async function waitGenerated(cookie: string, bilanId: string, timeoutMs = 120_000) {
  const headers: any = { 'content-type': 'application/json' };
  if (cookie) headers['cookie'] = cookie;
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = await fetch(`${BASE}/api/bilan/${encodeURIComponent(bilanId)}/status`, { method: 'GET', headers });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const st = (j?.status || '').toUpperCase();
      console.log('[CHECK] Status:', st);
      if (st === 'GENERATED') return true;
    }
    await wait(2500);
  }
  return false;
}

async function checkPdfs(cookie: string) {
  // Use latest-report to get report IDs
  const headers: any = { 'content-type': 'application/json' };
  if (cookie) headers['cookie'] = cookie;
  const r = await fetch(`${BASE}/api/bilan/latest-report`, { method: 'GET', headers });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error('latest-report failed: ' + r.status + ' ' + txt);
  }
  const js = await r.json().catch(() => ({}));
  const byType = new Map(js?.reports?.map((x: any) => [String(x.type), x]));
  const eleve = byType.get('eleve');
  const enseignant = byType.get('enseignant');
  if (!eleve?.id || !enseignant?.id) throw new Error('Missing report IDs');

  async function checkOne(id: string, label: string) {
    const res = await fetch(`${BASE}/api/bilan/download/${encodeURIComponent(id)}`, { method: 'GET', headers, redirect: 'manual' as any });
    console.log(`[CHECK] ${label} PDF status:`, res.status);
    if (![200, 302, 301].includes(res.status)) throw new Error(`${label} PDF not available (status ${res.status})`);
  }

  await checkOne(eleve.id, 'eleve');
  await checkOne(enseignant.id, 'enseignant');
}

(async () => {
  const { cookie } = await loginStudent();
  const ok = await waitGenerated(cookie, BILAN_ID, 180_000);
  if (!ok) throw new Error('Timeout waiting GENERATED');
  await checkPdfs(cookie);
  console.log('[CHECK] VERIFIED: status GENERATED and PDFs accessible');
})();
