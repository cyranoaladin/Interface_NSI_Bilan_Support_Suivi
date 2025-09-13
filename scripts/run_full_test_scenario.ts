// @ts-nocheck
import fetch, { Headers } from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url: string, init: any, attempts = 10, delayMs = 2000) {
  let lastErr: any = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url, init);
      return r;
    } catch (e) {
      lastErr = e;
      const jitter = Math.floor(Math.random() * 300);
      await wait(delayMs + jitter);
    }
  }
  throw lastErr || new Error('fetchWithRetry failed');
}

async function waitServerReady(base: string, attempts = 20) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(base, { method: 'GET' });
      if (r.ok) return;
    } catch {}
    await wait(1500);
  }
  throw new Error('Server not ready');
}

async function main() {
  console.log('[SCENARIO] Waiting for server readiness...');
  await waitServerReady(BASE);
  const headers: any = { 'Content-Type': 'application/json' };
  // 1) Login via production endpoint
  let cookie = '';
  {
    const r = await fetchWithRetry(`${BASE}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: 'aziz.acheb-e@ert.tn', password: 'password123' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Login failed: ' + r.status + ' ' + JSON.stringify(j));
    const setCookie = r.headers.get('set-cookie') || '';
    cookie = (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
    console.log('[SCENARIO] Login OK role=', j?.role, 'cookie=', cookie ? 'set' : 'missing');
  }

  // 2) Create bilan
  let bilanId = '';
  {
    const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
    const r = await fetchWithRetry(`${BASE}/api/bilan/create`, { method: 'POST', headers: h, body: JSON.stringify({}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.bilanId) throw new Error('Create bilan failed: ' + r.status + ' ' + JSON.stringify(j));
    bilanId = String(j.bilanId);
    console.log('[SCENARIO] Bilan created:', bilanId);
  }

  // 3) Submit answers (vary some responses for a non-trivial payload)
  const qcmAnswers = {
    // viser des scores contrastés: Python (fort), Web (moyen), Structures/Donnees (faibles)
    python_types: 'A',       // bon
    control_flow: 'A',       // bon
    dicts: 'C',              // faible
    algo_trace: 'B',         // moyen
    web_http: 'B',           // moyen
    tad_structures: 'D',     // faible
  } as any;
  const pedagoAnswers = {
    motivation_globale: 4,
    attitude_cours: 'Active et curieuse',
    engagement_travail_perso: 3,
    leviers_investissement: ['projets', 'défi intellectuel'],
    craintes_anticipees_nsi: 'Structures de données et lecture d’algorithmes',
    utilise_documentation: 3,
    decompose_probleme_code: 3,
    utilise_tests_code: 2,
    documente_code: 2,
    organisation_hebdo: '2x45 min + 1h pratique',
    temps_nsi_hors_classe: '2h',
    autonomie_projets: 3,
  };
  {
    const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
    const r = await fetchWithRetry(`${BASE}/api/bilan/${encodeURIComponent(bilanId)}/submit-answers`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ qcmAnswers, pedagoAnswers })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Submit answers failed: ' + r.status + ' ' + JSON.stringify(j));
    console.log('[SCENARIO] Submit answers OK. Status:', j?.bilan?.status);
  }

  console.log('[SCENARIO] Completed successfully');
}

main().catch((e) => { console.error('[SCENARIO] Error:', e?.message || e); process.exit(1); });
