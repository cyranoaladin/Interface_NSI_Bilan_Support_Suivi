// @ts-nocheck
import fetch, { Headers } from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
const STUDENT_PASS = process.env.E2E_STUDENT_PASS || 'password123';

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitServerReady(base: string, attempts = 20) {
  for (let i = 1; i <= attempts; i++) {
    try { const r = await fetch(base, { method: 'GET' }); if (r.ok) return; } catch {}
    await wait(1500);
  }
  throw new Error('Server not ready');
}

function randomPick<T>(arr: T[]): T | null { if (!Array.isArray(arr) || arr.length === 0) return null; return arr[Math.floor(Math.random() * arr.length)]; }
function randomSubset<T>(arr: T[]): T[] { const n = arr.length; const k = Math.max(1, Math.floor(Math.random() * Math.min(3, n))); const copy = [...arr]; const out: T[] = []; for (let i=0;i<k;i++){ const t = copy.splice(Math.floor(Math.random()*copy.length),1)[0]; if (t !== undefined) out.push(t); } return Array.from(new Set(out)); }
function randomSentence(): string {
  const subjects = ['Je', 'Nous', 'Parfois', 'Souvent', 'En NSI, je'];
  const verbs = ['apprends', 'révise', 'pratique', 'teste', 'explore'];
  const objs = ['Python', 'les algorithmes', 'les structures de données', 'HTTP', 'la logique'];
  return `${randomPick(subjects)} ${randomPick(verbs)} ${randomPick(objs)} avec curiosité.`;
}

async function main() {
  console.log('[RANDOM_SUBMIT] Waiting server...');
  await waitServerReady(BASE);

  // 1) Login student
  const headers: any = { 'content-type': 'application/json' };
  if (process.env.TEST_MODE_HEADER === '1') headers['x-test-mode'] = 'true';
  let cookie = '';
  {
    const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASS }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Login failed: ' + r.status + ' ' + JSON.stringify(j));
    const setCookie = r.headers.get('set-cookie') || '';
    cookie = (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
    console.log('[RANDOM_SUBMIT] Login OK: role=', j?.role, 'cookie=', cookie ? 'set' : 'missing');
  }

  // 2) Create bilan
  let bilanId = '';
  {
    const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
    const r = await fetch(`${BASE}/api/bilan/create`, { method: 'POST', headers: h, body: JSON.stringify({}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.bilanId) throw new Error('Create bilan failed: ' + r.status + ' ' + JSON.stringify(j));
    bilanId = String(j.bilanId);
    console.log('[RANDOM_SUBMIT] Bilan created:', bilanId);
    try { require('fs').writeFileSync('/tmp/last_bilan_id.txt', bilanId); } catch {}
  }

  // 3) Fetch questionnaire structure
  let qcm: any = { items: [] }; let pedago: any = { questions: [] };
  {
    const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
    const r = await fetch(`${BASE}/api/bilan/questionnaire-structure`, { method: 'GET', headers: h });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error('Fetch questionnaire-structure failed: ' + r.status);
    qcm = j.qcm || { items: [] };
    pedago = j.pedago || { questions: [] };
    console.log('[RANDOM_SUBMIT] Loaded structure: qcm.items=', (qcm.items || []).length, 'pedago.questions=', (pedago.questions || []).length);
  }

  // 4) Generate random answers
  const qcmAnswers: Record<string, any> = {};
  for (const it of Array.isArray(qcm.items) ? qcm.items : []) {
    const id = String(it?.id || ''); if (!id) continue;
    const type = String(it?.type || '').toLowerCase();
    const choices = Array.isArray(it?.choices) ? it.choices : [];
    if (type === 'msq') {
      const ks = choices.map((c: any) => c?.k).filter(Boolean);
      const pick = randomSubset(ks);
      if (pick.length > 0) qcmAnswers[id] = pick;
    } else if (type === 'short') {
      qcmAnswers[id] = randomSentence();
    } else {
      const ks = choices.map((c: any) => c?.k).filter(Boolean);
      const pick = randomPick(ks);
      if (pick) qcmAnswers[id] = pick;
    }
  }
  const pedagoAnswers: Record<string, any> = {};
  for (const q of Array.isArray(pedago?.questions) ? pedago.questions : []) {
    const id = String(q?.id || ''); if (!id) continue;
    const type = String(q?.type || '').toLowerCase();
    if (type === 'single') {
      const pick = randomPick(Array.isArray(q.options) ? q.options : []);
      if (pick !== null) pedagoAnswers[id] = pick;
    } else if (type === 'multi') {
      const picks = randomSubset(Array.isArray(q.options) ? q.options : []);
      pedagoAnswers[id] = picks;
    } else if (type === 'text') {
      pedagoAnswers[id] = randomSentence() + ' ' + randomSentence();
    } else if (type === 'likert') {
      pedagoAnswers[id] = 1 + Math.floor(Math.random() * 5);
    } else {
      // fallback
      pedagoAnswers[id] = randomSentence();
    }
  }

  // 5) Submit answers
  {
    const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
    const r = await fetch(`${BASE}/api/bilan/${encodeURIComponent(bilanId)}/submit-answers`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ qcmAnswers, pedagoAnswers })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Submit answers failed: ' + r.status + ' ' + JSON.stringify(j));
    console.log('[RANDOM_SUBMIT] Submit OK. Status:', j?.bilan?.status);
  }

  console.log('[RANDOM_SUBMIT] Done');
}

main().catch((e) => { console.error('[RANDOM_SUBMIT] Error:', e?.message || e); process.exit(1); });
