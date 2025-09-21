// @ts-nocheck
// Perf scenario runner (3 runs by default)
//
// Environment knobs:
// - BASE_URL: base URL for web app (default http://localhost:3000)
// - PDF_TIMEOUT_ELEVE: timeout (seconds) to wait for élève PDF (default 30)
// - PDF_TIMEOUT_ENSEIGNANT: timeout (seconds) to wait for enseignant PDF (default 30)
//
// Usage example:
//   export PDF_TIMEOUT_ELEVE=20
//   export PDF_TIMEOUT_ENSEIGNANT=40
//   npm run perf:test

import fetch, { Headers } from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PERF_DIR = path.resolve(process.cwd(), 'docs/perf_reports');
const TIMEOUT_ELEVE_S = Math.max(5, Number(process.env.PDF_TIMEOUT_ELEVE || 30));
const TIMEOUT_ENS_S = Math.max(5, Number(process.env.PDF_TIMEOUT_ENSEIGNANT || 30));
const RUNS = Math.max(1, Number(process.env.PERF_RUNS || 3));

function now() { return Date.now(); }
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

async function login(email: string, password: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  const r = await fetchWithRetry(`${BASE}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email, password }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Login failed: ' + r.status + ' ' + JSON.stringify(j));
  const setCookie = r.headers.get('set-cookie') || '';
  const cookie = (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
  return { cookie, role: j?.role };
}

async function createBilan(cookie: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (cookie) headers.set('cookie', cookie);
  const r = await fetchWithRetry(`${BASE}/api/bilan/create`, { method: 'POST', headers, body: JSON.stringify({}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.bilanId) throw new Error('Create bilan failed: ' + r.status + ' ' + JSON.stringify(j));
  return String(j.bilanId);
}

async function submitAnswers(bilanId: string, cookie: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (cookie) headers.set('cookie', cookie);
  const qcmAnswers: any = {
    'PY-B-01': 'A',
    'PY-B-02': 'A',
    'PY-DICT-01': 'C',
    'ALGO-TRACE-01': 'B',
    'WEB-HTTP-01': 'B',
    'TAD-STRUCT-01': 'D',
  };
  const pedagoAnswers: any = {
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
  const r = await fetchWithRetry(`${BASE}/api/bilan/${encodeURIComponent(bilanId)}/submit-answers`, {
    method: 'POST', headers, body: JSON.stringify({ qcmAnswers, pedagoAnswers })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Submit answers failed: ' + r.status + ' ' + JSON.stringify(j));
}

async function waitPdfReady(bilanId: string, cookie: string, variant: 'eleve' | 'enseignant', maxWaitMs: number) {
  const headers = new Headers(); if (cookie) headers.set('cookie', cookie);
  const url = `${BASE}/api/bilan/pdf/${encodeURIComponent(bilanId)}?variant=${variant}`;
  const start = now();
  while (now() - start < maxWaitMs) {
    try {
      const r = await fetch(url, { method: 'GET', headers });
      if (r.status === 200) return true;
    } catch {}
    await wait(1500);
  }
  return false;
}

// HTTP check to verify real availability of PDF via API (HEAD preferred, GET fallback)
async function checkPdfAvailable(bilanId: string, cookie: string, variant: 'eleve' | 'enseignant') {
  const headers = new Headers(); if (cookie) headers.set('cookie', cookie);
  const url = `${BASE}/api/bilan/pdf/${encodeURIComponent(bilanId)}?variant=${variant}`;
  try {
    // Try HEAD to fetch headers quickly
    const head = await fetch(url, { method: 'HEAD', headers });
    const cth = (head.headers?.get('content-type') || '').toLowerCase();
    if (head.status === 200 && cth.includes('application/pdf')) return { ok: true, code: head.status, type: cth };
    // Fallback GET
    const get = await fetch(url, { method: 'GET', headers });
    const ctg = (get.headers?.get('content-type') || '').toLowerCase();
    return { ok: get.status === 200 && ctg.includes('application/pdf'), code: get.status, type: ctg };
  } catch (e) {
    return { ok: false, code: 0, type: '' };
  }
}

function readLatestAttemptSummary(sinceMs: number) {
  try {
    if (!fs.existsSync(PERF_DIR)) return null;
    const files = fs.readdirSync(PERF_DIR).filter(f => /^attempt_.+\.json$/.test(f));
    let best = null; let bestMtime = 0;
    for (const f of files) {
      const full = path.join(PERF_DIR, f);
      const st = fs.statSync(full);
      if (st.mtimeMs >= sinceMs && st.mtimeMs > bestMtime) { best = full; bestMtime = st.mtimeMs; }
    }
    if (!best) return null;
    const js = JSON.parse(fs.readFileSync(best, 'utf8'));
    return js;
  } catch { return null; }
}

async function waitAttemptSummary(sinceMs: number, maxWaitMs = 15000, intervalMs = 1000) {
  const end = now() + maxWaitMs;
  let last: any = null;
  while (now() < end) {
    const s: any = readLatestAttemptSummary(sinceMs);
    if (s && typeof s === 'object') {
      // Accept the summary when any of the expected metrics is present
      if (s.eleve_render_ms != null || s.enseignant_render_ms != null || s.upload_eleve_ms != null || s.upload_enseignant_ms != null || s.eleve_size_kb != null || s.enseignant_size_kb != null || s.sections_total_ms != null || s.pdf_url_eleve || s.pdf_url_enseignant) {
        return s;
      }
      last = s;
    }
    await wait(intervalMs);
  }
  return last || {};
}

async function runOnce(runIndex: number) {
  console.log(`[RUN ${runIndex}] start`);
  const t0 = now();
  const { cookie } = await login(process.env.E2E_TEACHER_EMAIL || 'aziz.acheb-e@ert.tn', process.env.E2E_TEACHER_PASS || 'password123');
  const bilanId = await createBilan(cookie);
  await submitAnswers(bilanId, cookie);

  const okE = await waitPdfReady(bilanId, cookie, 'eleve', TIMEOUT_ELEVE_S * 1000);
  if (!okE) console.log(`[PDF_FALLBACK_USED] eleve bilanId=${bilanId} reason=timeout after ${TIMEOUT_ELEVE_S}s`);
  const okT = await waitPdfReady(bilanId, cookie, 'enseignant', TIMEOUT_ENS_S * 1000);
  if (!okT) console.log(`[PDF_FALLBACK_USED] enseignant bilanId=${bilanId} reason=timeout after ${TIMEOUT_ENS_S}s`);

  const totalMs = now() - t0;
  // Wait briefly for worker to emit enriched PDF SUMMARY
  const summary = await waitAttemptSummary(t0, 30000, 1000) || {};
  if (summary && typeof summary === 'object') {
    if (typeof summary.sections_total_ms === 'number') {
      console.log(`[PDF TIME] sections_total_ms=${summary.sections_total_ms}`);
    }
    try {
      console.log('[PDF SUMMARY]', JSON.stringify(summary));
    } catch {}
  }
  // Verify real availability via API regardless of local polling success
  const chkE = await checkPdfAvailable(bilanId, cookie, 'eleve');
  const chkT = await checkPdfAvailable(bilanId, cookie, 'enseignant');

  const out = {
    bilanId,
    total_time_s: +(totalMs / 1000).toFixed(2),
    llm_total_ms: summary.sections_total_ms ?? null,
    render_eleve_ms: summary.eleve_render_ms ?? null,
    render_enseignant_ms: summary.enseignant_render_ms ?? null,
    size_eleve_kb: summary.eleve_size_kb ?? null,
    size_enseignant_kb: summary.enseignant_size_kb ?? null,
    upload_eleve_ms: summary.upload_eleve_ms ?? null,
    upload_enseignant_ms: summary.upload_enseignant_ms ?? null,
    pdf_fallback_eleve: !okE || !!summary.degraded || false,
    pdf_fallback_enseignant: !okT || !!summary.degraded || false,
    sanitation_mode: summary.sanitation_mode ?? null,
    degraded: !!summary.degraded || (!okE || !okT),
    degraded_reason: summary.degraded_reason || ((!okE || !okT) ? 'timeout' : null),
    success: !!okE && !!okT,
    // New: real availability flags based on HTTP check
    pdf_eleve_dispo: !!chkE?.ok,
    pdf_enseignant_dispo: !!chkT?.ok,
    // Optional: record last HTTP status/content-type for debugging
    pdf_eleve_http: { code: chkE?.code || 0, type: chkE?.type || '' },
    pdf_enseignant_http: { code: chkT?.code || 0, type: chkT?.type || '' },
    // Diagnostics propagated from worker summary when available
    s3_upload_attempted_eleve: summary.s3_upload_attempted_eleve ?? null,
    s3_upload_success_eleve: summary.s3_upload_success_eleve ?? null,
    s3_upload_attempted_enseignant: summary.s3_upload_attempted_enseignant ?? null,
    s3_upload_success_enseignant: summary.s3_upload_success_enseignant ?? null,
    pdf_url_eleve: summary.pdf_url_eleve ?? null,
    pdf_url_enseignant: summary.pdf_url_enseignant ?? null,
    report_inserted_eleve: summary.report_inserted_eleve ?? null,
    report_inserted_enseignant: summary.report_inserted_enseignant ?? null
  } as any;
  console.log(`[RUN ${runIndex}] result`, out);
  return out;
}

async function main() {
  console.log('[SCENARIO] Waiting for server readiness...');
  await waitServerReady(BASE);
  try { fs.mkdirSync(PERF_DIR, { recursive: true }); } catch {}

  const results = [] as any[];
for (let i = 1; i <= RUNS; i++) {
    const r = await runOnce(i);
    results.push(r);
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const report = { timestamp: new Date().toISOString(), base_url: BASE, timeouts: { eleve_s: TIMEOUT_ELEVE_S, enseignant_s: TIMEOUT_ENS_S }, runs_count: RUNS, runs: results } as any;
  const outPath = path.join(PERF_DIR, `report_${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  try { fs.writeFileSync(path.join(PERF_DIR, 'latest.json'), JSON.stringify(report, null, 2)); } catch {}

  // Generate Markdown table + synthesis
  try {
    const header = '| Run | BilanId | Total Time (s) | Render Élève (ms) | Render Enseignant (ms) | Upload Élève (ms) | Upload Enseignant (ms) | Taille Élève (KB) | Taille Enseignant (KB) | Fallback Élève | Fallback Enseignant | Success | PDF Élève dispo | PDF Enseignant dispo |\n';
    const sep = '|-----|----------|----------------|-------------------|------------------------|-------------------|------------------------|-------------------|------------------------|----------------|---------------------|---------|-----------------|-----------------------|\n';
    const rows = results.map((r: any, i: number) => {
      const cells = [
        String(i + 1), r.bilanId, String(r.total_time_s ?? ''),
        String(r.render_eleve_ms ?? ''), String(r.render_enseignant_ms ?? ''),
        String(r.upload_eleve_ms ?? ''), String(r.upload_enseignant_ms ?? ''),
        String(r.size_eleve_kb ?? ''), String(r.size_enseignant_kb ?? ''),
        String(!!r.pdf_fallback_eleve), String(!!r.pdf_fallback_enseignant), String(!!r.success),
        (!!r.pdf_eleve_dispo ? 'oui' : 'non'), (!!r.pdf_enseignant_dispo ? 'oui' : 'non')
      ];
      return `| ${cells.join(' | ')} |\n`;
    }).join('');

    // Summary numbers
    const totals = results.map((r: any) => Number(r.total_time_s)).filter((x: any) => !isNaN(x));
    const pct = (p: number, arr: number[]) => {
      if (arr.length === 0) return null;
      const s = [...arr].sort((a, b) => a - b);
      const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
      return s[idx];
    };
    const min = totals.length ? Math.min(...totals) : null;
    const median = totals.length ? pct(50, totals) : null;
    const p95 = totals.length ? pct(95, totals) : null;
    const successRate = results.length ? (100 * results.filter((r: any) => !!r.success).length / results.length) : 0;
    const pdfChecks = results.reduce((acc: any, r: any) => acc + (r.pdf_eleve_dispo ? 1 : 0) + (r.pdf_enseignant_dispo ? 1 : 0), 0);
    const pdfTotal = results.length * 2;
    const pdfAvailPct = pdfTotal ? (100 * pdfChecks / pdfTotal) : 0;
    const partialSuccess = results.filter((r: any) => !r.success && (r.pdf_eleve_dispo || r.pdf_enseignant_dispo)).length;

    const md = [
      header, sep, rows,
      '\n',
      `Min / Median / P95 Total Time (s): ${min ?? 'n/a'} / ${median ?? 'n/a'} / ${p95 ?? 'n/a'}\n`,
      `Taux de succès (%): ${successRate.toFixed(1)}\n`,
      `Disponibilité PDFs via API (%): ${pdfAvailPct.toFixed(1)}\n`,
      (partialSuccess > 0 ? `Cas success=false mais PDF dispo=oui: ${partialSuccess}\n` : '')
    ].join('');

    const mdPath = path.join(PERF_DIR, `report_${ts}.md`);
    fs.writeFileSync(mdPath, md);
    console.log('[SCENARIO] Markdown report saved to', mdPath);
  } catch (e) {
    console.warn('[SCENARIO] Failed to generate markdown summary:', (e as any)?.message || e);
  }

  console.log('[SCENARIO] Perf report saved to', outPath);
}

main().catch((e) => { console.error('[SCENARIO] Error:', e?.message || e); process.exit(1); });
