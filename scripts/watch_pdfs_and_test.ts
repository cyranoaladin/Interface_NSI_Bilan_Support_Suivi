// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const BASE_DIR = '/home/alaeddine/Interface_NSI_2025_2026_local/docs/artifacts_premium_final';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
const STUDENT_PASS = process.env.E2E_STUDENT_PASS || 'password123';

async function wait(ms:number){ return new Promise(r=>setTimeout(r, ms)); }

async function login() {
  const fetch = (await import('node-fetch')).default as any;
  const r = await fetch(BASE_URL + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASS }) });
  const setCookie = r.headers.get('set-cookie') || '';
  return (setCookie.split(/,\s?/)[0] || '').split(';')[0] || '';
}

async function headDownload(cookie: string, reportId: string) {
  const fetch = (await import('node-fetch')).default as any;
  const r = await fetch(BASE_URL + `/api/bilan/download/${reportId}`, { method: 'HEAD', headers: { cookie } });
  return r.status;
}

async function findReportsForAttempt(cookie: string, attemptId: string) {
  const fetch = (await import('node-fetch')).default as any;
  const r = await fetch(BASE_URL + '/api/my/reports', { headers: { cookie } });
  const js = await r.json().catch(()=>({}));
  const items = Array.isArray(js.reports) ? js.reports : [];
  const filtered = items.filter((x:any)=> x.attemptId === attemptId);
  return filtered;
}

function scanNewAttempts(sinceMs: number) {
  const files = fs.existsSync(BASE_DIR) ? fs.readdirSync(BASE_DIR) : [];
  const map = new Map<string, { eleve?: string, enseignant?: string, mtimeMs: number }>();
  for (const f of files) {
    const m = f.match(/^(eleve|enseignant)_([^\.]+)\.pdf$/);
    if (!m) continue;
    const role = m[1]; const attemptId = m[2];
    const full = path.join(BASE_DIR, f);
    const st = fs.statSync(full);
    if (st.mtimeMs < sinceMs) continue;
    const prev = map.get(attemptId) || { mtimeMs: 0 } as any;
    prev[role] = full; prev.mtimeMs = Math.max(prev.mtimeMs, st.mtimeMs);
    map.set(attemptId, prev);
  }
  // Return attempts with both files
  return Array.from(map.entries()).filter(([_, v]) => v.eleve && v.enseignant).sort((a,b)=>a[1].mtimeMs - b[1].mtimeMs);
}

async function runApiBlock(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'test', '-c', 'apps/web/playwright.config.ts', 'apps/web/tests/e2e/api_validation.spec.ts'], { cwd: '/home/alaeddine/Interface_NSI_2025_2026_local', stdio: 'inherit' });
    child.on('close', (code) => resolve(code === 0));
  });
}

(async () => {
  const start = Date.now();
  let foundAttempt: string | null = null;
  for (let i=0;i<40;i++) { // up to ~10 minutes (every 15s)
    const pairs = scanNewAttempts(start);
    if (pairs.length > 0) {
      const [attemptId, info] = pairs[pairs.length - 1];
      foundAttempt = attemptId;
      console.log('[WATCH] New artifacts pair detected for attempt:', attemptId);
      const cookie = await login();
      const reps = await findReportsForAttempt(cookie, attemptId);
      if (reps.length >= 2) {
        const byType = new Map(reps.map((r:any)=>[String(r.type), r]));
        const e = byType.get('eleve');
        const t = byType.get('enseignant');
        if (e?.id && t?.id) {
          const hsE = await headDownload(cookie, e.id);
          const hsT = await headDownload(cookie, t.id);
          console.log('[WATCH] HEAD eleve=', hsE, 'enseignant=', hsT);
          if (hsE === 200 && hsT === 200) {
            console.log('[WATCH] PDFs ready (local/real). Running API block...');
            const ok = await runApiBlock();
            if (ok) {
              console.log('[WATCH] API block passed.');
              process.exit(0);
            } else {
              console.log('[WATCH] API block failed. Will retry next cycle.');
            }
          }
        }
      }
    }
    await wait(15000);
  }
  console.error('[WATCH] Timeout waiting for real PDFs.');
  process.exit(2);
})();
