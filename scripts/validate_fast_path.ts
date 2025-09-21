/*
 [VALIDATION-SCRIPT] Fast path validation for NSI project
 - Steps:
   a) POST /api/test/setup { cleanup: true }
   b) POST /api/auth/login (x-test-mode: true) → capture session cookie
   c) POST /api/bilan/create using cookie → extract bilanId
   d) POST /api/bilan/{bilanId}/submit-answers with x-test-mode: true
 - Exit non‑zero on any error; log clear progress messages.

 Usage (inside web container):
   npx ts-node -P tsconfig.scripts.json scripts/validate_fast_path.ts

 Env overrides:
   BASE_URL                default: http://localhost:3000
   E2E_STUDENT_EMAIL       default: alaeddine.benrhouma+eleve_term@ert.tn
   E2E_STUDENT_PASS        default: password123
 */

// We prefer the global fetch (Node 18+). Fallback to node-fetch if missing.
async function getFetch(): Promise<typeof fetch> {
  // @ts-ignore
  const g: any = global;
  if (typeof g.fetch === 'function') return g.fetch.bind(globalThis) as any;
  const mod: any = await import('node-fetch');
  return (mod.default || mod) as typeof fetch;
}

function nowIso() { return new Date().toISOString(); }

function pickCookiesFromHeaders(headers: Headers): string[] {
  // Try multiple strategies to get Set-Cookie values (Node fetch vs node-fetch)
  const out: string[] = [];
  try {
    // @ts-ignore: undici allows getSetCookie
    const getSetCookie = (headers as any).getSetCookie?.bind(headers);
    if (typeof getSetCookie === 'function') {
      const arr = getSetCookie(); if (Array.isArray(arr)) return arr.slice();
    }
  } catch {}
  try {
    const v = headers.get('set-cookie');
    if (v) out.push(v);
  } catch {}
  try {
    const raw = (headers as any).raw?.();
    const arr = raw && raw['set-cookie'];
    if (Array.isArray(arr)) out.push(...arr);
  } catch {}
  return out;
}

function toCookieJar(setCookieStrings: string[], prevJar: string[] = []): string[] {
  const jar = [...prevJar];
  for (const s of setCookieStrings || []) {
    const first = String(s).split(';', 1)[0].trim();
    if (!first || !first.includes('=')) continue;
    const name = first.split('=')[0].trim();
    const idx = jar.findIndex(c => c.startsWith(name + '='));
    if (idx >= 0) jar[idx] = first; else jar.push(first);
  }
  return jar;
}

async function main() {
  const fetch = await getFetch();
  const BASE = process.env.BASE_URL || 'http://localhost:3000';
  const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
  const STUDENT_PASS = process.env.E2E_STUDENT_PASS || 'password123';

  console.log(`[VALIDATION-SCRIPT] Start @ ${nowIso()} BASE=${BASE}`);

  let cookies: string[] = [];
  async function req(method: string, path: string, body?: any, extraHeaders: Record<string,string> = {}) {
    const url = path.startsWith('http') ? path : BASE.replace(/\/$/, '') + path;
    const headers: Record<string,string> = { 'accept': 'application/json', ...extraHeaders };
    const init: any = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = headers['content-type'] || 'application/json';
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    if (cookies.length > 0) {
      headers['cookie'] = cookies.join('; ');
    }
    const res = await fetch(url, init as any);
    const setc = pickCookiesFromHeaders(res.headers);
    if (setc && setc.length > 0) cookies = toCookieJar(setc, cookies);
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, ok: (res.status >= 200 && res.status < 300), headers: res.headers, text, json };
  }

  // a) Setup
  console.log('[VALIDATION-SCRIPT] Step a) setup (cleanup=true)');
  {
    const r = await req('POST', '/api/test/setup', { cleanup: true, groupCode: 'TNSI' }, { 'x-test-mode': 'true' });
    if (!r.ok) {
      console.error('[VALIDATION-SCRIPT] setup failed:', r.status, r.text.slice(0, 300));
      process.exit(1);
    }
    console.log('[VALIDATION-SCRIPT] Setup OK');
  }

  // b) Login
  console.log('[VALIDATION-SCRIPT] Step b) login');
  {
    const r = await req('POST', '/api/auth/login', { email: STUDENT_EMAIL, password: STUDENT_PASS }, { 'x-test-mode': 'true' });
    if (!r.ok) {
      console.error('[VALIDATION-SCRIPT] Login failed:', r.status, r.text.slice(0, 300));
      process.exit(1);
    }
    if (!cookies.some(c => /^session=/.test(c))) {
      console.warn('[VALIDATION-SCRIPT] Warning: session cookie not detected; continuing with whatever cookies present.');
    }
    const role = (r.json && r.json.role) ? String(r.json.role) : 'unknown';
    console.log(`[VALIDATION-SCRIPT] Login OK as role=${role}`);
  }

  // c) Create bilan
  let bilanId = '';
  console.log('[VALIDATION-SCRIPT] Step c) create bilan');
  {
    const r = await req('POST', '/api/bilan/create', {}, { 'x-test-mode': 'true' });
    if (!r.ok || !r.json || !r.json.bilanId) {
      console.error('[VALIDATION-SCRIPT] Create bilan failed:', r.status, r.text.slice(0, 400));
      process.exit(1);
    }
    bilanId = String(r.json.bilanId);
    console.log(`[VALIDATION-SCRIPT] Bilan créé: ${bilanId}`);
  }

  // d) Submit answers (fast path will be used because of x-test-mode)
  console.log('[VALIDATION-SCRIPT] Step d) submit answers (fast path expected)');
  {
    const payload = { qcmAnswers: {}, pedagoAnswers: {} };
    const r = await req('POST', `/api/bilan/${encodeURIComponent(bilanId)}/submit-answers`, payload, { 'x-test-mode': 'true' });
    if (!r.ok) {
      console.error('[VALIDATION-SCRIPT] Submit answers failed:', r.status, r.text.slice(0, 400));
      process.exit(1);
    }
    console.log('[VALIDATION-SCRIPT] Submit OK');
  }

  console.log('[VALIDATION-SCRIPT] All steps (a→d) completed successfully.');
}

main().catch((e) => {
  console.error('[VALIDATION-SCRIPT] Fatal error:', e?.message || e);
  process.exit(1);
});