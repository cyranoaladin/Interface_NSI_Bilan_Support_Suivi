// @ts-nocheck
import fetch, { Headers } from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PERF_DIR = path.resolve(process.cwd(), 'docs/perf_reports');

function nowMs() { return Date.now(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitServerReady(base: string, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(base, { method: 'GET' });
      if (r.ok) return;
    } catch {}
    await sleep(1500);
  }
  throw new Error('Server not ready');
}

async function fetchWithRetry(url: string, init: any, attempts = 10, delayMs = 1500) {
  let lastErr: any = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch(url, init);
      return r;
    } catch (e) {
      lastErr = e;
      await sleep(delayMs + Math.floor(Math.random() * 200));
    }
  }
  throw lastErr || new Error('fetchWithRetry failed');
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
    'PY-B-01': 'A', 'PY-B-02': 'A', 'WEB-HTTP-01': 'B', 'ALGO-TRACE-01': 'B', 'TAD-STRUCT-01': 'D'
  };
  const pedagoAnswers: any = {
    motivation_globale: 4,
    attitude_cours: 'Active',
    engagement_travail_perso: 3,
  };
  const r = await fetchWithRetry(`${BASE}/api/bilan/${encodeURIComponent(bilanId)}/submit-answers`, { method: 'POST', headers, body: JSON.stringify({ qcmAnswers, pedagoAnswers }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Submit answers failed: ' + r.status + ' ' + JSON.stringify(j));
}

async function waitPdfReady(bilanId: string, cookie: string, variant: 'eleve' | 'enseignant', maxWaitMs = 120000) {
  const headers = new Headers(); if (cookie) headers.set('cookie', cookie);
  const url = `${BASE}/api/bilan/pdf/${encodeURIComponent(bilanId)}?variant=${variant}`;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch(url, { method: 'GET', headers });
      if (r.status === 200) return true;
    } catch {}
    await sleep(2000);
  }
  return false;
}

function listAttemptSummariesSince(sinceMs: number) {
  try {
    if (!fs.existsSync(PERF_DIR)) return [] as string[];
    const files = fs.readdirSync(PERF_DIR).filter(f => /^attempt_.+\.json$/.test(f));
    const out = [] as string[];
    for (const f of files) {
      const full = path.join(PERF_DIR, f);
      const st = fs.statSync(full);
      if (st.mtimeMs >= sinceMs) out.push(full);
    }
    return out.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  } catch { return [] as string[]; }
}

function pickSummaryForWindow(sinceMs: number, untilMs: number, consumed: Set<string>) {
  const cands = listAttemptSummariesSince(sinceMs).filter(p => fs.statSync(p).mtimeMs <= untilMs);
  for (const p of cands) { if (!consumed.has(p)) { consumed.add(p); try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {} } }
  return null;
}

function pct(p: number, arr: number[]) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}

async function runOne(i: number, cookie: string, consumed: Set<string>) {
  const t0 = nowMs();
  let bilanId = '';
  try {
    bilanId = await createBilan(cookie);
    await submitAnswers(bilanId, cookie);
    const okE = await waitPdfReady(bilanId, cookie, 'eleve');
    const okT = await waitPdfReady(bilanId, cookie, 'enseignant');
    const t1 = nowMs();
    const summary = pickSummaryForWindow(t0, t1 + 5000, consumed) || {};
    return {
      run: i,
      bilanId,
      total_time_s: +(((t1 - t0) / 1000).toFixed(2)),
      llm_total_ms: summary.sections_total_ms ?? null,
      render_eleve_ms: summary.eleve_render_ms ?? null,
      render_enseignant_ms: summary.enseignant_render_ms ?? null,
      upload_eleve_ms: summary.upload_eleve_ms ?? null,
      upload_enseignant_ms: summary.upload_enseignant_ms ?? null,
      size_eleve_kb: summary.eleve_size_kb ?? null,
      size_enseignant_kb: summary.enseignant_size_kb ?? null,
      success: !!okE && !!okT,
    };
  } catch (e) {
    const t1 = nowMs();
    return {
      run: i,
      bilanId,
      total_time_s: +(((t1 - t0) / 1000).toFixed(2)),
      llm_total_ms: null,
      render_eleve_ms: null,
      render_enseignant_ms: null,
      upload_eleve_ms: null,
      upload_enseignant_ms: null,
      size_eleve_kb: null,
      size_enseignant_kb: null,
      success: false,
      error: (e as any)?.message || String(e)
    };
  }
}

async function main() {
  const N = Math.max(1, Number(process.argv.find(a => a.startsWith('--n='))?.split('=')[1] || process.env.N || 5));
  console.log('[LOAD] Base URL:', BASE, 'N=', N);
  await waitServerReady(BASE);
  try { fs.mkdirSync(PERF_DIR, { recursive: true }); } catch {}
  const { cookie } = await login(process.env.E2E_TEACHER_EMAIL || 'aziz.acheb-e@ert.tn', process.env.E2E_TEACHER_PASS || 'password123');
  const consumed = new Set<string>();
  const t0 = new Date().toISOString();
  const tasks = [] as Promise<any>[];
  for (let i = 1; i <= N; i++) tasks.push(runOne(i, cookie, consumed));
  const runs = await Promise.all(tasks);
  const totals = runs.map(r => r.total_time_s).filter((x: any) => typeof x === 'number');
  const report = {
    timestamp: new Date().toISOString(),
    base_url: BASE,
    N,
    runs,
    stats: {
      min_total_s: totals.length ? Math.min(...totals) : null,
      median_total_s: totals.length ? pct(50, totals) : null,
      p95_total_s: totals.length ? pct(95, totals) : null,
      success_rate: runs.length ? +(100 * runs.filter(r => r.success).length / runs.length).toFixed(1) : 0
    }
  };
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const outPath = path.join(PERF_DIR, `load_report_${ts}_N${N}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('[LOAD] Report saved to', outPath);
}

main().catch(e => { console.error('[LOAD] Error:', e?.message || e); process.exit(1); });