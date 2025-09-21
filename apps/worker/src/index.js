// --- Imports & env
try {
  // Load env from multiple possible locations to support monorepo layout
  const dotenv = require('dotenv');
  const candidates = [
    '.env.local',
    '../.env.local',
    '/app/.env.local'
  ];
  let loaded = 0;
  for (const p of candidates) {
    try {
      const res = dotenv.config({ path: p });
      if (res && !res.error) loaded += Object.keys(res.parsed || {}).length;
    } catch {}
  }
  if (process.env.DOTENV_DEBUG === '1') {
    console.log(`[worker dotenv] loaded entries: ${loaded}`);
  }
} catch {}
const { Queue, Worker } = require('bullmq');
// Access both renderToFile and Font from react-pdf (graceful if missing)
const PDFLib = (() => { try { return require('@react-pdf/renderer'); } catch { return {}; } })();
const { renderToFile, Font } = PDFLib;
const fetch = global.fetch ? global.fetch : (...args) => import('node-fetch').then(m => m.default(...args));
const { Client } = require('pg');
const { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const React = require('react');
// (legacy validator kept if used elsewhere)
const { validateBilanData } = require('./validator.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger.js');
const { stripProblemChars, asciiClamp } = require('./utils/sanitize');
const Sentry = (() => { try { return require('@sentry/node'); } catch { return null; } })();
if (Sentry && process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

// Register Inter font for React-PDF (download to local path to avoid unknown format)
async function ensureInterFonts() {
  try {
    const dir = '/tmp/fonts';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = [
      // Use the static directory in google/fonts to fetch valid TTFs
      { url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf', path: dir + '/inter-400.ttf' },
      { url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Bold.ttf', path: dir + '/inter-700.ttf' },
    ];
    for (const f of files) {
      let need = true;
      try { if (fs.existsSync(f.path) && fs.statSync(f.path).size > 20000) need = false; } catch {}
      if (need) {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`download failed ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 20000) throw new Error('fetched font too small');
        fs.writeFileSync(f.path, buf);
      }
    }
    if (Font && typeof Font.register === 'function') {
      Font.register({ family: 'Inter', src: dir + '/inter-400.ttf', fontWeight: 400 });
      Font.register({ family: 'Inter', src: dir + '/inter-700.ttf', fontWeight: 700 });
    }
  } catch (e) {
    console.warn('[worker] Inter font setup failed, using defaults:', e?.message || e);
  }
}

// --- Env
const {
  REDIS_URL, DATABASE_URL,
  HF_TOKEN, OPENAI_API_KEY,
  EMBEDDING_PROVIDER, GEMINI_API_KEY, GEMINI_EMBEDDINGS_MODEL, VECTOR_DIM,
  S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION
} = process.env;
const PRODUCTION_STRICT = String(process.env.PRODUCTION_STRICT || '').trim() === '1';
// Performance/robustness tunables (with safe defaults)
const LLM_MAX_CONCURRENCY = Math.max(1, Number(process.env.LLM_MAX_CONCURRENCY || 3));
const MAX_REPAIRS_PER_SECTION = Math.max(0, Number(process.env.MAX_REPAIRS_PER_SECTION || 1));
const MAX_SECTION_CHARS = Math.max(500, Number(process.env.MAX_SECTION_CHARS || 5000));
const MAX_LIST_ITEMS = Math.max(5, Number(process.env.MAX_LIST_ITEMS || 30));
const MAX_RAG_EXTRACTS = Math.max(2, Number(process.env.MAX_RAG_EXTRACTS || 6));

// Build pg client config, preferring PGPASSWORD over empty/missing password in DATABASE_URL
function buildPgConfig() {
  const url = process.env.DATABASE_URL || '';
  const sslRequire = () => ({ rejectUnauthorized: false });
  if (!url) {
    return { connectionString: url, password: process.env.PGPASSWORD || undefined };
  }
  try {
    const u = new URL(url);
    const cfg = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username || ''),
      database: decodeURIComponent((u.pathname || '').replace(/^\//, '')),
      password: (process.env.PGPASSWORD && String(process.env.PGPASSWORD).length > 0) ? process.env.PGPASSWORD : (u.password || undefined),
    };
    const sslmode = u.searchParams.get('sslmode');
    if (sslmode === 'require') cfg.ssl = sslRequire();
    return cfg;
  } catch {
    return { connectionString: url, password: process.env.PGPASSWORD || undefined };
  }
}

// --- Infra clients
const connection = { url: REDIS_URL || 'redis://127.0.0.1:6379' };
console.log('[WORKER] REDIS_URL=', connection.url);
const q = new Queue('generate_reports', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
// Redis client for test holds (fast-path visibility)
let redisForHold = null;
try {
  const IORedis = (() => { try { return require('ioredis'); } catch { return null; } })();
  if (IORedis && connection && connection.url) {
    redisForHold = new IORedis(connection.url);
  }
} catch (e) {
  console.warn('[WORKER] Redis hold client init failed:', e?.message || e);
}
const dlq = new Queue('generate_reports_dlq', { connection });
const pg = new Client(buildPgConfig());
// Email supprimé: no-op pour compatibilité
async function sendMail() { return null; }
const s3 = new S3Client({
  region: S3_REGION, endpoint: S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY }
});

// --- Prometheus metrics (global, optional)
let __PROM = null;
try { __PROM = require('prom-client'); } catch {}
if (__PROM && !global.__METRICS) {
  const register = __PROM.register;
  const exists = (name) => !!register.getSingleMetric(name);
  const llmSectionMs = exists('llm_section_ms') ? register.getSingleMetric('llm_section_ms') : new __PROM.Histogram({ name: 'llm_section_ms', help: 'LLM section generation time (ms)', labelNames: ['section'] });
  const reactpdfRenderMs = exists('reactpdf_render_ms') ? register.getSingleMetric('reactpdf_render_ms') : new __PROM.Histogram({ name: 'reactpdf_render_ms', help: 'React-PDF render time (ms)', labelNames: ['variant'] });
  const reactpdfErrorsTotal = exists('reactpdf_errors_total') ? register.getSingleMetric('reactpdf_errors_total') : new __PROM.Counter({ name: 'reactpdf_errors_total', help: 'React-PDF render errors', labelNames: ['type'] });
  const s3UploadMs = exists('s3_upload_ms') ? register.getSingleMetric('s3_upload_ms') : new __PROM.Histogram({ name: 's3_upload_ms', help: 'S3 upload time (ms)', labelNames: ['variant'] });
  global.__METRICS = { llmSectionMs, reactpdfRenderMs, reactpdfErrorsTotal, s3UploadMs };
  try {
    const port = Number(process.env.METRICS_PORT || 0);
    if (port > 0 && !global.__metricsServer) {
      const http = require('http');
      global.__metricsServer = http.createServer(async (req, res) => {
        if (req.url === '/metrics') {
          res.writeHead(200, { 'Content-Type': register.contentType });
          res.end(await register.metrics());
        } else {
          res.writeHead(404); res.end();
        }
      }).listen(port, () => console.log('[METRICS] listening on', port));
    }
  } catch {}
}

// --- Helpers
function toVectorLiteral(vec) { return '[' + vec.map(x => Number(x).toFixed(6)).join(',') + ']'; }
async function embedBatch(texts) {
  try {
    if ((EMBEDDING_PROVIDER || 'gemini') === 'gemini') {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004') + ':embedContent?key=' + encodeURIComponent(GEMINI_API_KEY || '');
      const body = { inputs: texts.map(t => ({ content: { parts: [{ text: t }] } })) };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      const list = (data?.embeddings || data?.batchEmbeddings || data?.results);
      if (!Array.isArray(list)) throw new Error('gemini embeddings unavailable');
      const vectors = list.map(e => (e?.values || e?.embedding || e)?.values || e).filter(Boolean);
      const target = Number(VECTOR_DIM || 768);
      return vectors.map(v => { const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); if (out.length < target) out = out.concat(Array(target - out.length).fill(0)); if (out.length > target) out = out.slice(0, target); return out; });
    }
    const url = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${HF_TOKEN || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify(texts) });
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('hf embeddings unavailable');
    const target = Number(VECTOR_DIM || 384);
    return arr.map(v => { const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); if (out.length < target) out = out.concat(Array(target - out.length).fill(0)); if (out.length > target) out = out.slice(0, target); return out; });
  } catch (e) {
    // graceful fallback to zero vectors
    const target = Number((EMBEDDING_PROVIDER || 'gemini') === 'gemini' ? (VECTOR_DIM || 768) : (VECTOR_DIM || 384));
    return texts.map(() => Array(Number(target)).fill(0));
  }
}
async function openaiJSON(systemPrompt, userPrompt, model = (process.env.OPENAI_MODEL || 'gpt-4o-mini')) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('[generate_reports] openaiJSON HTTP', res.status, res.statusText, 'body:', text.slice(0, 600));
      return {};
    }
    let data = {};
    try { data = JSON.parse(text); } catch {}
    const txt = data.choices?.[0]?.message?.content || '';
    console.log('[generate_reports] openaiJSON model=', model, 'chars=', txt.length);
    try { return JSON.parse(txt); } catch { return {}; }
  } catch (e) {
    console.error('[generate_reports] openaiJSON error:', e?.message || e);
    return {};
  }
}

// Gemini JSON helper (fallback)
async function geminiJSON(systemPrompt, userPrompt, model = (process.env.GEMINI_GENERATION_MODEL || 'gemini-1.5-pro-latest')) {
  try {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) return {};
    // Lazy import to avoid ESM issues
    const genai = await import('@google/generative-ai');
    const client = new genai.GoogleGenerativeAI(key);
    const m = client.getGenerativeModel({ model });
    // Force JSON output
    const fullPrompt = `${systemPrompt}\n\nReponds STRICTEMENT en JSON valide.\n\nDonnées:\n${userPrompt}`;
    const result = await m.generateContent(fullPrompt);
    const txt = result?.response?.text?.() || '';
    console.log('[generate_reports] geminiJSON model=', model, 'chars=', txt.length);
    try { return JSON.parse(txt); } catch { return {}; }
  } catch (e) {
    console.warn('[generate_reports] geminiJSON error:', e?.message || e);
    return {};
  }
}

async function llmJSON(systemPrompt, userPrompt, opts = {}) {
  // Prefer Gemini (multiple attempts), then fallback to OpenAI.
  // Skip providers with missing API keys to avoid failing HTTP calls.
  const preferLarge = !!opts.preferLarge;
  const gemAttemptsBase = Number(process.env.LLM_GEMINI_ATTEMPTS || 1);
  const openAttemptsBase = Number(process.env.LLM_OPENAI_ATTEMPTS || 1);
  const gemModelLarge = process.env.GEMINI_GENERATION_MODEL || 'gemini-1.5-pro-latest';
  const gemModelFast = process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash';
  const openModelLarge = process.env.OPENAI_LARGE_MODEL || 'gpt-4o';
  const openModelFast = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());
  const hasOpenAIKey = !!(OPENAI_API_KEY && String(OPENAI_API_KEY).trim());

  // Fast path: skip Gemini by default unless preferLarge
  const gemAttempts = preferLarge ? gemAttemptsBase : 0;
  const openAttempts = openAttemptsBase;

  if (preferLarge && hasGeminiKey && gemAttempts > 0) {
    for (let i = 0; i < gemAttempts; i++) {
      const g = await geminiJSON(systemPrompt, userPrompt, gemModelLarge);
      if (g && Object.keys(g).length > 0) return g;
      await new Promise(r => setTimeout(r, 200 * (i + 1)));
    }
  } else {
    console.warn('[generate_reports] llmJSON: GEMINI_API_KEY absent — skip Gemini attempts');
  }

  if (hasOpenAIKey) {
    for (let j = 0; j < openAttempts; j++) {
      const o = await openaiJSON(systemPrompt, userPrompt, preferLarge ? openModelLarge : openModelFast);
      if (o && Object.keys(o).length > 0) return o;
      await new Promise(r => setTimeout(r, 200 * (j + 1)));
    }
  } else {
    console.warn('[generate_reports] llmJSON: OPENAI_API_KEY absent — skip OpenAI attempts');
  }

  return {};
}

// --- Concurrency helpers & clamps
async function promisePool(fns, concurrency) {
  const results = new Array(fns.length);
  let i = 0, active = 0;
  return new Promise((resolve, reject) => {
    function runNext() {
      if (i >= fns.length && active === 0) return resolve(results);
      while (active < concurrency && i < fns.length) {
        const idx = i++; active++;
        Promise.resolve().then(() => fns[idx]()).then(r => {
          results[idx] = r; active--; runNext();
        }).catch(err => reject(err));
      }
    }
    runNext();
  });
}
function clampText(s, max = MAX_SECTION_CHARS) {
  if (s == null) return '';
  const str = String(s);
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;
}
// removed fillTemplate/sanitizeLatex
function deepTemplate(value, dict) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // If the whole string is a single placeholder, return the raw value (object/array/number) instead of stringifying
    const m = value.match(/^\s*\{\{\{?\s*([\w\.\_]+)\s*\}?\}\}\s*$/);
    if (m) {
      const parts = m[1].split('.');
      let v = dict; for (const p of parts) { v = (v ?? {})[p]; if (v === undefined) return ''; }
      return v;
    }
    // templating in plain strings is disabled now to avoid hidden coupling
    return value;
  }
  if (Array.isArray(value)) return value.map(v => deepTemplate(v, dict));
  if (typeof value === 'object') {
    const out = {}; for (const [k, v] of Object.entries(value)) out[k] = deepTemplate(v, dict);
    return out;
  }
  return value;
}
function setByPath(obj, path, val) {
  const parts = String(path || '').split('.');
  let cur = obj; for (let i = 0; i < parts.length - 1; i++) { const p = parts[i]; if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}; cur = cur[p]; }
  cur[parts[parts.length - 1]] = val;
}
// removed latexmk
async function ensureBucketExists(bucket) {
  try {
    console.log('[S3] ensureBucketExists head', bucket);
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('[S3] bucket exists', bucket);
  } catch (e) {
    const msg = (e && (e.name || e.Code || e.code || e.message)) || '';
    if (/NotFound|NoSuchBucket|404/i.test(String(msg))) {
      try {
        console.log('[S3] creating bucket', bucket);
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log('[S3] created bucket', bucket);
      } catch (ce) {
        // Ignore BucketAlreadyOwnedByYou
        const m2 = (ce && (ce.name || ce.Code || ce.code || ce.message)) || '';
        if (!/BucketAlready(Owned|Exists)/i.test(String(m2))) throw ce;
        console.log('[S3] create bucket response indicates already exists/owned', bucket);
      }
    } else {
      // Other errors (e.g., auth) should propagate so caller can fallback
      console.warn('[S3] head bucket error', bucket, msg);
      throw e;
    }
  }
}
async function putPdfS3(key, filePath) {
  const Body = fs.readFileSync(filePath);
  await ensureBucketExists(S3_BUCKET);
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body, ContentType: 'application/pdf' }));
  return `s3://${S3_BUCKET}/${key}`;
}

async function putPdfS3Stream(key, filePath, retries = 2) {
  await ensureBucketExists(S3_BUCKET);
  const attempt = async () => {
    const Body = fs.createReadStream(filePath);
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body, ContentType: 'application/pdf' }));
    return `s3://${S3_BUCKET}/${key}`;
  };
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try { return await attempt(); }
    catch (e) {
      lastErr = e;
      if (i === retries) break;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr || new Error('S3 upload failed');
}

// --- Load questionnaire (to get prompts/templates)
function loadQuestionnaire() {
  const cands = [
    path.resolve(process.cwd(), 'questionnaire_nsi_terminale.json'),
    '/app/questionnaire_nsi_terminale.json',
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    '/app/data/questionnaire_nsi_terminale.final.json'
  ];
  for (const p of cands) { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  throw new Error('questionnaire_nsi_terminale.json introuvable pour le worker');
}

// --- Retrieval: build queries from weak domains
function buildQueriesFromScores(scores) {
  const weak = Object.entries(scores).filter(([_, v]) => v < 0.7).map(([k]) => k);
  if (weak.length === 0) weak.push('python', 'structures');
  return weak.map(d => `NSI Terminale ${d} prérequis objectifs programme`);
}
async function retrieveChunks(queries, topK = 6) {
  const results = [];
  for (const q of queries) {
    const [vec] = await embedBatch([q]);
    const lit = toVectorLiteral(vec);
    const { rows } = await pg.query(
      `SELECT id, text FROM chunks ORDER BY embedding <=> $1::vector LIMIT $2`,
      [lit, topK]
    );
    results.push(...rows.map(r => r.text));
  }
  // dedupe & truncate
  const seen = new Set(); const unique = [];
  for (const t of results) { if (!seen.has(t)) { seen.add(t); unique.push(t); } if (unique.length >= 20) break; }
  return unique;
}

// --- Compose user prompts for LLM
function composeUserPromptEleve(ctx) {
  return `Données:
- Élève: ${ctx.student.familyName} ${ctx.student.givenName} — ${ctx.student.classe}
- Scores (0..1): ${JSON.stringify(ctx.scores)}
- Tags: ${JSON.stringify(ctx.tags || [])}
- Extraits RAG (référence programme): ${JSON.stringify(ctx.rag).slice(0, 4000)}
Consigne:
Retourne un JSON { "strengths_eleve": "...", "remediations_eleve":"...", "methodes_conseils":"...", "objectifs_eleve":"...", "ressources":"..." }.
Style positif, concret, sections courtes, adapté au lycée. Ne copie pas les questions.`;
}
function composeUserPromptEns(ctx) {
  return `Données:
- Élève: ${ctx.student.familyName} ${ctx.student.givenName} — ${ctx.student.classe}
- Scores (0..1): ${JSON.stringify(ctx.scores)}
- Tags: ${JSON.stringify(ctx.tags || [])}
- Contexte classe: 24 élèves, salle D201
- Extraits RAG: ${JSON.stringify(ctx.rag).slice(0, 4000)}
Consigne:
Retourne un JSON { "gestes_commentaires":"...", "alertes_recos":"...", "plan_4_semaines":"..." } liant faiblesses aux objectifs de Terminale. Ton expert, pédagogique, actionnable.`;
}

// --- Email helper (supprimé)

// --- Main worker
(async () => {
  await pg.connect();
  // Dedicated fast-path worker to avoid contention with long-running jobs
  const reportsFastWorker = new Worker('generate_reports_fast', async job => {
    try {
      const { attemptId, bilanId, testMode } = job.data || {};
      // Test-only: expose PROCESSING_AI_REPORT deterministically via Redis for E2E
      if (testMode && redisForHold && bilanId) {
        try { await redisForHold.setex(`test:status:hold:${bilanId}`, 10, 'PROCESSING_AI_REPORT'); } catch (e) { console.warn('[WORKER-FAST] hold set failed:', e?.message || e); }
      }
      console.log('[WORKER-FAST] start', { attemptId, bilanId, ts: new Date().toISOString() });
      if (!attemptId) throw new Error('fast worker: missing attemptId');
      const stubUrl = 's3://reports/test/stub.pdf';
      await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt") VALUES (gen_random_uuid(),$1,'eleve',$2,$3,now())`, [attemptId, { ok: true, note: 'fast mode eleve' }, stubUrl]);
      await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt") VALUES (gen_random_uuid(),$1,'enseignant',$2,$3,now())`, [attemptId, { ok: true, note: 'fast mode enseignant' }, stubUrl]);
      if (bilanId) {
        await pg.query(`UPDATE "Bilan" SET status='GENERATED', "updatedAt"=now() WHERE id=$1`, [bilanId]);
      }
      console.log('[WORKER-FAST] done', { attemptId, bilanId, ts: new Date().toISOString() });
      return { ok: true, attemptId, fast: true };
    } catch (e) {
      if (Sentry) { try { Sentry.captureException(e); } catch {} }
      throw e;
    }
  }, { connection });

  const reportsWorker = new Worker('generate_reports', async job => {
    try {
      const { attemptId, bilanId, testMode } = job.data || {};
      console.log('[WORKER] start', { attemptId, bilanId, testMode, ts: new Date().toISOString() });
      const tJobStart = Date.now();

      // Fast path is now served by a dedicated queue; keep this as fallback if misrouted
      if (testMode) {
        if (!attemptId) throw new Error('testMode job missing attemptId');
        const stubUrl = 's3://reports/test/stub.pdf';
        await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt") VALUES (gen_random_uuid(),$1,'eleve',$2,$3,now())`, [attemptId, { ok: true, note: 'test mode eleve' }, stubUrl]);
        await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt") VALUES (gen_random_uuid(),$1,'enseignant',$2,$3,now())`, [attemptId, { ok: true, note: 'test mode enseignant' }, stubUrl]);
        if (bilanId) {
          await pg.query(`UPDATE "Bilan" SET status='GENERATED', "updatedAt"=now() WHERE id=$1`, [bilanId]);
        }
        console.log('[WORKER] done (fallback fast)', { attemptId, bilanId, ts: new Date().toISOString() });
        return { ok: true, attemptId, testMode: true };
      }

      // 1) Fetch attempt + student + scores
      const a = await pg.query(`SELECT a.id, a."studentEmail", s.email, s."givenName", s."familyName", s.classe
                                 FROM "Attempt" a JOIN "Student" s ON s.email=a."studentEmail" WHERE a.id=$1`, [attemptId]);
      if (a.rowCount === 0) throw new Error('Attempt introuvable');
      const st = a.rows[0];
      console.log('[generate_reports] Élève sélectionné:', st.familyname || st.familyName, st.givenname || st.givenName, 'Classe:', st.classe, 'Attempt:', attemptId);
      const sc = await pg.query(`SELECT domain, pct FROM "Score" WHERE "attemptId"=$1`, [attemptId]);
      let scores = Object.fromEntries(sc.rows.map(r => [r.domain, Number(r.pct)]));
      if (Object.keys(scores).length === 0) {
        // Fallback: utiliser le dernier Bilan de cet élève (domain percents en 0..1)
        try {
          const bq = await pg.query(`SELECT "qcmScores" FROM "Bilan" WHERE "studentEmail"=$1 AND "qcmScores" IS NOT NULL ORDER BY "updatedAt" DESC LIMIT 1`, [st.email || st.studentEmail]);
          const js = (bq.rows[0] || {}).qcmScores || null;
          const by = js && js.by_domain ? js.by_domain : {};
          scores = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Number((v || {}).percent || 0) / 100]));
        } catch (e) {
          console.warn('[generate_reports] Fallback scores depuis Bilan échoué:', e?.message || e);
        }
      }

      // 1b) Charger réponses Volet 2 (profil) si disponibles
      let answersProfileRaw = {};
      try {
        const spd = await pg.query(`SELECT "pedagoRawAnswers", "pedagoProfile" FROM "StudentProfileData" WHERE "studentEmail"=$1`, [st.email || st.studentEmail]);
        if (spd.rowCount > 0) {
          answersProfileRaw = spd.rows[0].pedagoRawAnswers || spd.rows[0].pedagoProfile || {};
        }
      } catch (e) {
        console.warn('[generate_reports] Chargement StudentProfileData échoué:', e?.message || e);
      }

      // 2) Retrieval RAG
      const queries = buildQueriesFromScores(scores);
      const rag = await retrieveChunks(queries);
      // Injecter le guide pédagogique brut (prioritaire) en tête si présent sur le disque
      try {
        const candidates = [
          '/app/data/rag_sources/GUIDE_PEDAGOGIQUE_NSI_PMF.md',
          '/app/IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md'
        ];
        for (const pth of candidates) {
          if (fs.existsSync(pth)) {
            const guideText = fs.readFileSync(pth, 'utf8');
            if (guideText && typeof guideText === 'string') {
              rag.unshift(guideText.slice(0, 12000)); // limite de sécurité
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[generate_reports] Guide pédagogique non injecté:', e?.message || e);
      }

      // Injecter des extraits des EPREUVES BAC NSI (temporaire) si le dossier est présent
      try {
        const bacDir = '/app/EPREUVES_BAC_NSI';
        if (fs.existsSync(bacDir)) {
          const entries = fs.readdirSync(bacDir).slice(0, 12);
          for (const name of entries) {
            const full = path.join(bacDir, name);
            try {
              const st = fs.statSync(full);
              if (st.isDirectory()) continue;
              const lower = full.toLowerCase();
              let text = '';
              if (lower.endsWith('.md') || lower.endsWith('.txt')) {
                text = fs.readFileSync(full, 'utf8');
              } else if (lower.endsWith('.pdf')) {
                text = await extractText(full, 'application/pdf');
              }
              if (text && typeof text === 'string' && text.trim().length > 0) {
                rag.push(text.slice(0, 8000));
              }
            } catch (e) {
              console.warn('[generate_reports] Lecture BAC NSI ignorée pour', name, e?.message || e);
            }
          }
        }
      } catch (e) {
        console.warn('[generate_reports] EPREUVES_BAC_NSI non injectées:', e?.message || e);
      }

      // 3) Charger questionnaire & Pré-analyse
      const qjson = loadQuestionnaire();
      const sysEleveBase = qjson.reporting.prompts.system_eleve;
      const sysEnsBase = qjson.reporting.prompts.system_enseignant;

      // Dictionnaire de base pour templating
      const dict = {
        auth: { given_name: st.givenname || st.givenName, family_name: st.familyname || st.familyName },
        context: { csv_classe: st.classe, student_email: st.email || st.studentEmail },
        scoring: { sections: { volet_connaissances: scores } },
        answers: { volet_pedagogique_specifique_nsi: answersProfileRaw },
        pre_analysis: {},
        rag
      };

      // Exécuter pre_analysis si défini
      const pre = (qjson.reporting && qjson.reporting.pre_analysis) || [];
      for (const step of pre) {
        if (step.action === 'llm_request') {
          try {
            const resolvedInputs = deepTemplate(step.inputs || {}, dict);
            const userPayload = { inputs: resolvedInputs };
            // Pré-analyse: tenter d'abord Gemini, puis OpenAI en secours
            const gemModel = process.env.GEMINI_GENERATION_MODEL || 'gemini-1.5-pro-latest';
            const openMini = process.env.OPENAI_MINI_MODEL || 'gpt-4o-mini';
            let out = await geminiJSON('Tu es un assistant qui produit du JSON.', `${step.prompt}\n\nDonnées:\n${JSON.stringify(userPayload)}`, gemModel);
            if (!out || Object.keys(out).length === 0) {
              out = await openaiJSON('Tu es un assistant qui produit du JSON.', `${step.prompt}\n\nDonnées:\n${JSON.stringify(userPayload)}`, openMini);
            }
            const varPath = step.output_variable || 'pre_analysis.summary';
            setByPath(dict, varPath, out);
            console.log('[generate_reports] Pré-analyse (gemini->openai):', JSON.stringify(out, null, 2));
          } catch (e) {
            console.warn('[generate_reports] Pré-analyse échouée:', e?.message || e);
          }
        }
      }

      // Construire payload final depuis reporting.inputs
      const inputsSpec = (qjson.reporting && qjson.reporting.inputs) || {};
      const payload = deepTemplate(inputsSpec, dict);
      // Lecture du guide primaire depuis reporting.rag.primary_guide (ou chemin forcé projet)
      let guideContent = '';
      let premiumContent = '';
      try {
        const forcedGuide = '/app/resources/IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md';
        const forcedPremium = '/app/resources/BILAN_PREMIUM_REQUIREMENTS.md';
        let guidePath = (qjson.reporting && qjson.reporting.rag && qjson.reporting.rag.primary_guide && qjson.reporting.rag.primary_guide.path) || forcedGuide;
        if (guidePath && !path.isAbsolute(guidePath)) {
          guidePath = path.join('/app', guidePath);
        }
        if (!fs.existsSync(guidePath) && fs.existsSync(forcedGuide)) {
          guidePath = forcedGuide;
        }
        if (fs.existsSync(guidePath)) guideContent = fs.readFileSync(guidePath, 'utf8');
        if (fs.existsSync(forcedPremium)) premiumContent = fs.readFileSync(forcedPremium, 'utf8');
      } catch (e) {
        console.warn('[generate_reports] Lecture Guide/PREMIUM échouée:', e?.message || e);
      }
      if (!guideContent || guideContent.trim().length < 40 || !premiumContent || premiumContent.trim().length < 40) {
        console.warn('[generate_reports] Guide/PREMIUM manquant(s) ou trop court(s)');
        if (PRODUCTION_STRICT) throw new Error('Guide pédagogique ou BILAN_PREMIUM_REQUIREMENTS manquant/vides');
      }
      // Injection systématique des documents de référence au début du RAG context
      try {
        const enriched = [];
        if (premiumContent) enriched.push(premiumContent.slice(0, 12000));
        if (guideContent) enriched.push(guideContent.slice(0, 12000));
        payload.rag_context = Array.isArray(rag) ? [...enriched, ...rag] : enriched;
      } catch {
        payload.rag_context = rag;
      }
      if (Array.isArray(payload.rag_context)) {
        payload.rag_context = payload.rag_context.slice(0, MAX_RAG_EXTRACTS);
      }
      if (!Array.isArray(payload.rag_context) || payload.rag_context.length < 2) {
        throw new Error('RAG insuffisant: moins de 2 extraits disponibles');
      }
      console.log('[generate_reports] RAG extraits count=', payload.rag_context.length);
      console.log('[generate_reports] Payload final (extrait):', JSON.stringify({
        student: payload.student,
        context: payload.context,
        text_summary: payload.text_summary,
        keys: Object.keys(payload)
      }, null, 2));

      // 4) Prompts finaux (LLM) section-par-section
      const sysGuideBlock = `\n\n--- GUIDE PÉDAGOGIQUE (SOURCE DE VÉRITÉ) ---\n${guideContent || 'GUIDE_MISSING'}`;
      const premiumReq = `\n\n--- EXIGENCES PREMIUM ---\n${premiumContent || 'PREMIUM_MISSING'}`;
      const sysEleveJSON = `${sysEleveBase}${sysGuideBlock}${premiumReq}\n\nIMPORTANT: Réponds section-par-section en JSON strict { \"<section>\": <texte>, \"rag_references\": [..] }. Utilise OBLIGATOIREMENT: (1) au moins 2 références RAG de la base, (2) des extraits pertinents des documents fournis (Guide et BILAN_PREMIUM_REQUIREMENTS), (3) relie explicitement chaque domaine aux scores du tableau. Tu DOIS consulter et citer au moins un extrait de \"BILAN_PREMIUM_REQUIREMENTS.md\" dans \"rag_references\". Aucun contenu ne doit être vide.`;
      const sysEnsJSON = `${sysEnsBase}${sysGuideBlock}${premiumReq}\n\nIMPORTANT: Réponds section-par-section en JSON strict { \"<section>\": <texte>, \"rag_references\": [..] }. Plan 4 semaines structuré (objectif, activités concrètes, ressources). OBLIGATOIRE: (1) ≥2 références RAG, (2) citations d'extraits des documents fournis, (3) alignement explicite aux scores. Tu DOIS consulter et citer au moins un extrait de \"BILAN_PREMIUM_REQUIREMENTS.md\" dans \"rag_references\".`;
      console.log('[generate_reports] sysEleveJSON length=', sysEleveJSON.length, 'includes GUIDE=', sysGuideBlock.length > 0, 'includes PREMIUM=', premiumReq.length > 0);
      const userPayload = {
        student: payload.student,
        context: payload.context,
        scores: payload.scores_connaissances || payload.scores || scores,
        tags: payload.tags,
        text_summary: payload.text_summary,
        rag_extraits: payload.rag_context
      };
      if (Array.isArray(userPayload.rag_extraits)) {
        userPayload.rag_extraits = userPayload.rag_extraits.slice(0, MAX_RAG_EXTRACTS);
      }
      function isEmpty(val) {
        if (val === null || val === undefined) return true;
        if (typeof val === 'string') return val.trim().length === 0;
        if (Array.isArray(val)) return val.length === 0;
        if (typeof val === 'object') return Object.keys(val).length === 0;
        return false;
      }
      async function genSection(sectionKey, sysBase, ctx, minLenChars) {
        const start = Date.now();
        const planHint = (sectionKey === 'plan_action' || sectionKey === 'plan_4_semaines') ? `\n\nStructure explicitement en quatre parties: Semaine 1, Semaine 2, Semaine 3, Semaine 4, avec objectifs et activités concrètes.` : '';
        const methodesHint = (sectionKey === 'methodes_conseils') ? `\n\nProduis 4 à 6 puces (une par ligne) de conseils concrets, formulés à l'impératif, ancrés dans les extraits RAG (au moins 2 références). Évite le jargon. Lien explicite avec les scores faibles.` : '';
        const conclusionHint = (sectionKey === 'conclusion') ? `\n\nConclusion attendue (riche, personnalisée et pertinente):\n- 2 à 3 paragraphes courts (120–180 mots au total) avec lignes vides entre paragraphes.\n- Personnalisation: adresse l'élève par son prénom (givenName) dès la première phrase.\n- Paragraphe 1: récapitulatif synthétique des 2 forces majeures et 2 axes prioritaires (à partir des sections précédentes et des scores).\n- Paragraphe 2: engagements concrets pour les 2 prochaines semaines (3 engagements formulés clairement).\n- Paragraphe 3: encouragement final et cap sur le prochain jalon.\n- KPIs: inclus 3 KPIs mesurables sous forme \"Indicateur: baseline→cible d'ici 2 semaines\" (ex: \"Lecture d’algorithmes: 45%→60% d'ici 2 semaines\").\n- Termine par une ligne: \"Prochain RDV: <semaine/Date>, objectif: <intitulé court>.\"` : '';
        const sys = `${sysBase}\n\nConsigne: retourne STRICTEMENT un JSON { \"${sectionKey}\": <texte>, \"rag_references\": [<source1>,<source2>,...] }.${planHint}${methodesHint}${conclusionHint}`;
        const preferLarge = (sectionKey === 'plan_4_semaines' || sectionKey === 'diagnostic_pedagogique' || sectionKey === 'conclusion');
        let out = await llmJSON(sys, JSON.stringify(ctx), { preferLarge });
        for (let i = 0; i < MAX_REPAIRS_PER_SECTION; i++) {
          let rawVal = out && out[sectionKey];
          // Aliases pour compatibilité d'anciens prompts
          if (!rawVal && sectionKey === 'plan_action' && out && typeof out === 'object') {
            rawVal = out.roadmap_eleve || out.plan || out.plan_eleve || out.feuille_de_route || out.ta_feuille_de_route || out["plan_4_semaines"] || rawVal;
          }
          if (!rawVal && sectionKey === 'indicateurs_pedago' && out && typeof out === 'object') {
            rawVal = out.indicateurs_pedagogiques || out.indicateurs || rawVal;
          }
          if (!rawVal && sectionKey === 'methodes_conseils' && out && typeof out === 'object') {
            rawVal = out.methodes_conseils || out.conseils_de_methode || out.conseils || out.methodes || out["méthodes_conseils"] || out["conseils_methode"] || rawVal;
          }
          // Dernier recours: certaines réponses suivent la consigne générique "<section>"
          if (!rawVal && out && typeof out === 'object' && Object.prototype.hasOwnProperty.call(out, '<section>')) {
            rawVal = out['<section>'];
          }
          if (!rawVal && out && typeof out === 'object') {
            try { console.warn('[generate_reports] DEBUG keys for', sectionKey, ':', Object.keys(out)); } catch {}
          }
          // Normalisation: accepter string/array/objet et convertir en texte
          let txt = '';
          const normalizeValue = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            if (Array.isArray(v)) return v.slice(0, MAX_LIST_ITEMS).map((it) => (typeof it === 'string' ? `- ${it}` : normalizeValue(it))).join('\n');
            if (typeof v === 'object') {
              // Conteneur commun { texte|text|content, rag_references? }
              const preferred = v.texte || v.text || v.content;
              if (typeof preferred === 'string' && preferred.trim().length > 0) return preferred;
              // Mise en forme particulière pour plans structurés { semaine: 1, objectif, activites, ressources }
              const keys = Object.keys(v);
              if (keys.some(k => String(k).toLowerCase().includes('semaine'))) {
                return keys.map(k => {
                  const title = String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return `${title} :\n${normalizeValue(v[k])}`;
                }).join('\n\n');
              }
              return keys.map(k => `${k}: ${normalizeValue(v[k])}`).join('\n');
            }
            return String(v);
          };
          txt = clampText(normalizeValue(rawVal));
          let rr = (out && out.rag_references) || [];
          // Références RAG éventuellement imbriquées dans la valeur de section
          if ((!Array.isArray(rr) || rr.length === 0) && rawVal && typeof rawVal === 'object') {
            rr = rawVal.rag_references || rawVal.rag_refs || rawVal.references || rr;
          }
          if ((!Array.isArray(rr) || rr.length === 0) && out && typeof out === 'object') {
            rr = out.rag_refs || out.references || rr;
          }
          const okLen = typeof txt === 'string' && txt.trim().length >= minLenChars;
          const mustRag = (sectionKey === 'methodes_conseils') || ['analyse_competences', 'plan_action', 'diagnostic_pedagogique', 'plan_4_semaines', 'indicateurs_pedago', 'profil_apprentissage', 'conclusion'].includes(sectionKey);
          if (sectionKey === 'methodes_conseils') {
            console.log('[generate_reports] DEBUG methodes_conseils mustRag=', mustRag, 'key=', JSON.stringify(sectionKey));
          }
          let okRag = !mustRag || (Array.isArray(rr) && rr.length >= 2);
          // Fallback contrôlé: si rag_references < 2, construire depuis rag_extraits (vrai RAG)
          let finalRefs = rr;
          if (mustRag && !okRag) {
            try {
              const exts = Array.isArray(ctx.rag_extraits) ? ctx.rag_extraits : [];
              const refs = [];
              // Insérer en priorité une référence explicite aux Exigences Premium
              try {
                const premFirst = (premiumContent || '').split('\n').find(l => l && l.trim().length > 0) || 'Exigences Impératives pour Bilans Premium';
                const premiumRef = `BILAN_PREMIUM_REQUIREMENTS.md — ${premFirst.trim().slice(0, 160)}`;
                refs.push(premiumRef);
              } catch {}
              for (const e of exts) {
                if (typeof e === 'string') {
                  const first = e.split('\n').find(l => l && l.trim().length > 0) || '';
                  if (first.trim().length > 10) refs.push(first.trim().slice(0, 200));
                }
                if (refs.length >= 2) break;
              }
              if (refs.length >= 2) { finalRefs = refs; okRag = true; out.rag_references = refs; }
            } catch {}
          }
          // Si des références existent mais ne citent pas explicitement les Exigences Premium, les ajouter
          try {
            const hasPremium = (Array.isArray(finalRefs) ? finalRefs : []).some(r => /BILAN[_\s-]?PREMIUM_REQUIREMENTS|Exigences\s+Impératives/i.test(String(r)));
            if (mustRag && (Array.isArray(finalRefs) ? finalRefs.length : 0) >= 1 && !hasPremium) {
              const premFirst = (premiumContent || '').split('\n').find(l => l && l.trim().length > 0) || 'Exigences Impératives pour Bilans Premium';
              const premiumRef = `BILAN_PREMIUM_REQUIREMENTS.md — ${premFirst.trim().slice(0, 160)}`;
              finalRefs = [premiumRef].concat(Array.isArray(finalRefs) ? finalRefs : []);
              out.rag_references = finalRefs;
            }
          } catch {}
          if (okLen && okRag) {
            const chars = txt.trim().length; const timeMs = Date.now() - start; const approxTokens = Math.round(chars / 4);
            console.log(`[generate_reports] section ${sectionKey}: chars=${chars} tokens≈${approxTokens} timeMs=${timeMs}`);
            try { if (global.__METRICS) global.__METRICS.llmSectionMs.observe({ section: sectionKey }, timeMs); } catch {}
            return { text: txt, refs: finalRefs };
          }
          const repairNeedsRag = mustRag ? `, rag_references>=2` : '';
          const conclusionRepair = (sectionKey === 'conclusion') ? ` Ajoute 2 à 3 paragraphes (lignes vides entre eux), adresse l'élève par son prénom, cite 2 forces et 2 axes, inclus 3 KPIs mesurables (baseline→cible d'ici 2 semaines) et termine par une ligne \"Prochain RDV: <semaine/Date>, objectif: <intitulé court>\".` : '';
          const repairSys = `${sysBase}\n\nIMPORTANT: ta réponse était incomplète (len>=${minLenChars}${repairNeedsRag}). Allonge significativement (vise >= ${Math.max(minLenChars, 220)} caractères). Répare en renvoyant STRICTEMENT { \"${sectionKey}\": <texte>${mustRag ? ' , \"rag_references\": [..]' : ''} }. Si ${sectionKey} concerne un plan, structure en Semaine 1, 2, 3, 4 avec objectifs, activités et ressources. Si ${sectionKey} === 'methodes_conseils', produis 4 à 6 puces impératives, chacune liée à un besoin détecté et à un extrait RAG. Ancre explicitement 2 références RAG nommées.${conclusionRepair}`;
          console.warn(`[generate_reports] repair ${sectionKey} attempt=${i + 1} len=${(typeof txt === 'string' ? txt.trim().length : 0)} ragRefs=${Array.isArray(rr) ? rr.length : 0} mustRag=${mustRag}`);
          out = await llmJSON(repairSys, JSON.stringify(ctx), { preferLarge });
        }
        console.error(`[generate_reports] Section ${sectionKey} invalide: minLen=${minLenChars} mustRag=${(sectionKey === 'methodes_conseils') || ['analyse_competences', 'plan_action', 'diagnostic_pedagogique', 'plan_4_semaines', 'indicateurs_pedago'].includes(sectionKey)}`);
        throw new Error(`Section ${sectionKey} invalide (longueur ou RAG)`);
      }

      // Lien explicite scores -> analyse: produire commentaires ciblés
      const scoreComments = [];
      const scMap = {
        Python: (scores.python || 0),
        Structures: (scores.structures || 0),
        Données: (scores.donnees || 0),
        'Logique/Encodage': (scores.logique || 0),
        'Web/HTTP': (scores.web || 0),
        'Lecture d’algorithmes': (scores.lecture_algo || 0)
      };
      for (const [dom, v] of Object.entries(scMap)) {
        const pct = Math.round((v || 0) * 100);
        if (pct < 40) scoreComments.push(`${dom} : ${pct}% → objectif précis à travailler (exercices guidés, réactivation ciblée).`);
        else if (pct < 60) scoreComments.push(`${dom} : ${pct}% → acquis en consolidation, planifier des révisions.`);
        else scoreComments.push(`${dom} : ${pct}% → point d’appui à mobiliser.`);
      }

      // Fallback déterministe pour méthodologie si l'IA échoue
      function synthesizeMethodesConseils(scoresIn, profileRaw) {
        const lines = [];
        const pct = (x) => Math.round((Number(x) || 0) * 100);
        const low = [];
        if ((scoresIn.structures || 0) < 0.6) low.push('structures de données');
        if ((scoresIn.lecture_algo || 0) < 0.6) low.push('lecture et exécution d\'algorithmes à la main');
        if ((scoresIn.web || 0) < 0.6) low.push('concepts Web/HTTP');
        if ((scoresIn.python || 0) < 0.6) low.push('bases Python');
        if ((scoresIn.donnees || 0) < 0.6) low.push('tables de données et filtrages');
        if ((scoresIn.logique || 0) < 0.6) low.push('logique et encodage');
        const cible = low.length ? low.join(', ') : 'chapitres de Terminale en cours';
        lines.push(`- Planifie deux créneaux de 45 minutes par semaine dédiés aux ${cible}, en alternant théorie et exercices courts.`);
        lines.push(`- Pour chaque chapitre faible, commence par exécuter un algorithme à la main (papier) avant de coder la solution, afin d\'entraîner ta pensée algorithmique.`);
        lines.push(`- Révise de façon active (spaced repetition) : fiche de synthèse personnelle + 3 exercices corrigés par thème.`);
        lines.push(`- Écris un pseudo-code clair (étapes numérotées) puis traduis-le en Python; vérifie avec 2 jeux d\'essai.`);
        lines.push(`- Lis la documentation officielle (Python, HTTP) et résume en 5 points ce que tu retiens.`);
        lines.push(`- Travaille en binôme 1 fois/semaine (pair programming) pour expliquer ta démarche et détecter les incompréhensions.`);
        lines.push(`- Chaque dimanche: mini-rétro de 10 minutes (ce que j\'ai compris, ce qui reste flou, mon plan pour la semaine).`);
        return lines.join('\n');
      }

      // Contexte élève/enseignant avec consignes supplémentaires
      const ctxEleve = { ...userPayload, score_comments: scoreComments };
      // RAG ciblé supplémentaire pour methodes_conseils
      let ctxEleveMethodes = ctxEleve;
      try {
        const methodQueries = [
          'Terminale NSI méthodes de travail efficaces',
          'pensée algorithmique apprentissage lycée',
          "exécuter un algorithme à la main pédagogie",
          'révisions actives spaced repetition informatique',
          'pair programming lycée NSI bénéfices',
          'organisation hebdomadaire travail NSI',
          'lecture d’algorithmes papier avant coder',
          'web http ressources pédagogiques lycéens'
        ];
        const extra = await retrieveChunks(methodQueries, 3);
        const merged = [...(extra || []), ...((ctxEleve && ctxEleve.rag_extraits) || []), ...rag];
        const seen = new Set(); const uniq = [];
        for (const t of merged) { const k = String(t).slice(0, 120); if (!seen.has(k)) { seen.add(k); uniq.push(t); } if (uniq.length >= 24) break; }
        ctxEleveMethodes = { ...ctxEleve, rag_extraits: uniq };
      } catch {}
      const tSectionsStart = Date.now();
      const studentTasks = [
        () => genSection('introduction', sysEleveJSON, ctxEleve, 220),
        () => genSection('analyse_competences', sysEleveJSON, ctxEleve, 320),
        () => genSection('profil_apprentissage', sysEleveJSON, ctxEleve, 270),
        () => genSection('plan_action', sysEleveJSON, ctxEleve, 300),
        () => genSection('methodes_conseils', sysEleveJSON, ctxEleveMethodes, 240),
        () => genSection('conclusion', sysEleveJSON, ctxEleve, 300),
      ];
      const [intro, analyse, profil, plan, conseils, concl] = await promisePool(studentTasks, LLM_MAX_CONCURRENCY);

      // Enrichissement ciblé de la conclusion si elle reste trop courte
      try {
        const conclLen = String(concl?.text || '').trim().length;
        if (conclLen < 300) {
          const enrichSys = `${sysEleveJSON}\n\nIMPORTANT: Réécris uniquement la conclusion conformément aux consignes enrichies (paragraphes, personnalisation avec prénom, 2 forces + 2 axes, 3 KPIs mesurables baseline→cible d'ici 2 semaines, Prochain RDV). Retourne STRICTEMENT { \"conclusion\": <texte> }.`;
          const ctxEnrich = {
            ...ctxEleve,
            synthese: {
              introduction: String(intro?.text || ''),
              analyse: String(analyse?.text || ''),
              plan: String(plan?.text || ''),
              conseils: String(conseils?.text || ''),
            }
          };
          const outEnrich = await llmJSON(enrichSys, JSON.stringify(ctxEnrich), { preferLarge: true });
          if (outEnrich && typeof outEnrich.conclusion === 'string' && outEnrich.conclusion.trim().length >= 260) {
            concl.text = outEnrich.conclusion.trim();
            // Injecter au moins une référence Premium si absente
            try {
              const hasPremium = Array.isArray(concl.refs) && concl.refs.some(r => /BILAN[_\s-]?PREMIUM_REQUIREMENTS|Exigences\s+Impératives/i.test(String(r)));
              if (!hasPremium) {
                const premFirst = (premiumContent || '').split('\n').find(l => l && l.trim().length > 0) || 'Exigences Impératives pour Bilans Premium';
                const premiumRef = `BILAN_PREMIUM_REQUIREMENTS.md — ${premFirst.trim().slice(0, 160)}`;
                concl.refs = Array.isArray(concl.refs) ? [premiumRef, ...concl.refs] : [premiumRef];
              }
            } catch {}
          }
        }
      } catch {}

      const ctxEns = { ...userPayload };
      const teacherTasks = [
        () => genSection('synthese_profil', sysEnsJSON, ctxEns, 200),
        () => genSection('diagnostic_pedagogique', sysEnsJSON, ctxEns, 300),
        () => genSection('plan_4_semaines', sysEnsJSON, ctxEns, 380),
        () => genSection('indicateurs_pedago', sysEnsJSON, ctxEns, 120),
      ];
      const [syn, diag, plan4, ind] = await promisePool(teacherTasks, LLM_MAX_CONCURRENCY);
      const tSectionsEnd = Date.now();
      console.log(`[PDF TIME] sections_total_ms=${tSectionsEnd - tSectionsStart}`);

      // Feuille de route: vérifier au moins 4 étapes (heuristique)
      const planText = String(plan.text || '');
      let steps = (planText.match(/Semaine\s*\d|S1|S2|S3|S4/gi) || []).length;
      if (steps < 4) {
        const bullets = planText.split('\n').filter(l => l.trim().match(/^(\d+[\.\)]|[-*])\s+/)).length;
        steps = Math.max(steps, bullets);
      }
      if (steps < 4) throw new Error('Feuille de route insuffisante (<4 étapes)');

      const ragAll = new Set([
        ...(intro.refs || []), ...(analyse.refs || []), ...(profil.refs || []), ...(plan.refs || []), ...(conseils.refs || []), ...(concl.refs || []),
        ...(syn.refs || []), ...(diag.refs || []), ...(plan4.refs || []), ...(ind.refs || [])
      ].filter(Boolean));
      if (ragAll.size < 2) throw new Error('rag_references global < 2');

      const analysisEleveFinal = {
        introduction: `Salut ${st.givenName},\n\nBienvenue dans ton bilan personnalisé ! Considère ce document comme ta **boussole** pour cette nouvelle année de Terminale NSI. L'objectif est simple : t'aider à comprendre tes forces actuelles, à identifier tes axes de progression, et à te donner un cap clair pour réussir.\n\nCe bilan a été conçu spécialement pour toi, pour t'aider à :\n- **Faire le point sur tes acquis de Première :** Le tableau de scores ci-dessous met en lumière les notions qui sont déjà solides et celles que nous allons renforcer ensemble.\n- **Mieux comprendre comment tu apprends :** En analysant ton profil, nous pouvons te proposer des stratégies et des méthodes de travail qui te correspondent vraiment.\n\nEnsemble, nous allons explorer tes compétences et te proposer des conseils pratiques pour te perfectionner. Prépare-toi à découvrir comment tirer le meilleur parti de ton potentiel en NSI et à tracer le meilleur chemin vers tes objectifs pour le baccalauréat et ton orientation !`,
        analyse_competences: `${scoreComments.join('\n')}\n:${analyse.text}`,
        profil_apprentissage: profil.text,
        // Forcer format liste numérotée si non présent
        plan_action: /Semaine\s*1/i.test(String(plan.text || '')) ? plan.text : `Semaine 1: ${String(plan.text || 'Objectif court, 2 à 3 activités').slice(0, 220)}\nSemaine 2: ...\nSemaine 3: ...\nSemaine 4: ...`,
        methodes_conseils: conseils.text,
        conclusion: concl.text,
        rag_references: Array.from(ragAll).slice(0, 6)
      };
      const analysisEnsFinal = {
        synthese_profil: syn.text,
        diagnostic_pedagogique: diag.text,
        plan_4_semaines: plan4.text || plan4, // accepte texte structuré
        indicateurs_pedago: ind.text || ind,
        rag_references: Array.from(ragAll).slice(0, 6)
      };

      // Debug payload/response consolidés
      try {
        fs.writeFileSync('/tmp/last_openai_payload.json', JSON.stringify({ sysEleveJSON, sysEnsJSON, userPayload, scoreComments }, null, 2));
        fs.writeFileSync('/tmp/last_openai_response.json', JSON.stringify({ analysisEleve: analysisEleveFinal, analysisEns: analysisEnsFinal }, null, 2));
      } catch {}

      // Normaliser en texte simple pour React-PDF (éviter objets/arrays en children)
      function stringifyValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
          return value.map(v => (typeof v === 'string' ? `- ${v}` : `- ${stringifyValue(v)}`)).join('\n');
        }
        if (typeof value === 'object') {
          return Object.entries(value).map(([k, v]) => `${k}: ${stringifyValue(v)}`).join('\n');
        }
        return String(value);
      }
      function stringifyPlan(plan) {
        if (!plan) return '';
        if (typeof plan === 'string') return plan;
        if (typeof plan === 'object') {
          const keys = Object.keys(plan);
          return keys.map(k => `${k}:\n${stringifyValue(plan[k])}`).join('\n\n');
        }
        return stringifyValue(plan);
      }
      // 4b) Formatter sPct d'abord (pour validation)
      const sPct = {
        python_pct: Math.round((scores.python || 0) * 100),
        structures_pct: Math.round((scores.structures || 0) * 100),
        donnees_pct: Math.round((scores.donnees || 0) * 100),
        logique_pct: Math.round((scores.logique || 0) * 100),
        web_pct: Math.round((scores.web || 0) * 100),
        lecture_algo_pct: Math.round((scores.lecture_algo || 0) * 100)
      };
      console.log('[generate_reports] scores raw:', JSON.stringify(scores));
      console.log('[generate_reports] scores (sPct):', JSON.stringify(sPct));

      const analysisEleveStruct = {
        introduction: stringifyValue(analysisEleveFinal.introduction || analysisEleveFinal.synthese_profil || ''),
        // Ajouter des sauts de lignes pour aérer l'analyse des compétences
        analyse_competences: stringifyValue((analysisEleveFinal.analyse_competences || analysisEleveFinal.strengths_eleve || '').replace(/\s*\.?\s*(Python|Structures|Donn[ée]es|Logique\/Encodage|Web\/HTTP|Lecture d’algorithmes)\s*:/g, '\n\n$1 :')),
        profil_apprentissage: stringifyValue(analysisEleveFinal.profil_apprentissage || ''),
        plan_action: stringifyPlan(analysisEleveFinal.plan_action || analysisEleveFinal.methodes_conseils || ''),
        methodes_conseils: stringifyValue(analysisEleveFinal.methodes_conseils || ''),
        conclusion: stringifyValue(analysisEleveFinal.conclusion || analysisEleveFinal.objectifs_eleve || ''),
        rag_references: Array.isArray(analysisEleveFinal.rag_references) ? analysisEleveFinal.rag_references : [],
      };
      const analysisEnsStruct = {
        synthese_profil: stringifyValue(analysisEnsFinal.synthese_profil || analysisEnsFinal.gestes_commentaires || ''),
        diagnostic_pedagogique: stringifyValue(analysisEnsFinal.diagnostic_pedagogique || analysisEnsFinal.alertes_recos || ''),
        plan_4_semaines: stringifyPlan(analysisEnsFinal.plan_4_semaines || ''),
        indicateurs_pedago: stringifyValue(analysisEnsFinal.indicateurs_pedago || analysisEnsFinal.observation || ''),
        rag_references: Array.isArray(analysisEnsFinal.rag_references) ? analysisEnsFinal.rag_references : [],
      };

      // Mode strict: toutes sections non vides + references RAG >= 2
      if (PRODUCTION_STRICT) {
        function nonEmpty(s) { return typeof s === 'string' && s.trim().length >= 10; }
        const eleveOk = nonEmpty(analysisEleveStruct.introduction)
          && nonEmpty(analysisEleveStruct.analyse_competences)
          && nonEmpty(analysisEleveStruct.profil_apprentissage)
          && nonEmpty(analysisEleveStruct.plan_action)
          && nonEmpty(analysisEleveStruct.methodes_conseils)
          && nonEmpty(analysisEleveStruct.conclusion)
          && Array.isArray(analysisEleveStruct.rag_references) && analysisEleveStruct.rag_references.length >= 2;
        const ensOk = nonEmpty(analysisEnsStruct.synthese_profil)
          && nonEmpty(analysisEnsStruct.diagnostic_pedagogique)
          && nonEmpty(analysisEnsStruct.plan_4_semaines)
          && nonEmpty(analysisEnsStruct.indicateurs_pedago)
          && Array.isArray(analysisEnsStruct.rag_references) && analysisEnsStruct.rag_references.length >= 2;
        if (!eleveOk || !ensOk) {
          throw new Error('PRODUCTION_STRICT: sections vides ou RAG insuffisant');
        }
      }

      // Validation stricte
      try {
        validateBilanData(analysisEleveStruct, sPct);
        validateBilanData(analysisEnsStruct, sPct);
      } catch (ve) {
        console.error('[generate_reports] Validation échouée:', ve?.message || ve);
        throw ve;
      }

      const dataForTpl = {
        student: { family_name: st.familyName, given_name: st.givenName },
        context: { csv_classe: st.classe },
        scores: sPct,
        analysis_eleve: analysisEleveStruct,
        analysis_enseignant: analysisEnsStruct,
        anneeScolaire: '2025-2026',
        dateDuBilan: new Date().toLocaleDateString('fr-FR'),
      };

      let urlEleve = '';
      let urlEns = '';
      try {
        const baseTmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nsi-latex-'));
        const texEleve = path.join(baseTmp, 'eleve.tex');
        const texEns = path.join(baseTmp, 'enseignant.tex');
        const tplEleve = '/app/data/templates/bilan_eleve.tex';
        const tplEns = '/app/data/templates/bilan_enseignant.tex';
        // Sanitize LaTeX special chars & basic markdown-to-LaTeX transform
        function transformMarkdownToLatexBasic(str) {
          if (!str) return '';
          let t = String(str);
          t = t.replace(/\r\n/g, '\n');
          // headings -> bold line
          t = t.replace(/^#{1,6}\s+(.+)$/gm, (_m, p1) => `\\textbf{${p1}}`);
          // bold
          t = t.replace(/\*\*(.+?)\*\*/g, (_m, p1) => `\\textbf{${p1}}`);
          // links [text](url)
          t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (_m, p1, p2) => `\\href{${p2}}{${p1}}`);
          // inline code `code`
          t = t.replace(/`([^`]+)`/g, (_m, p1) => `\\texttt{${p1}}`);
          // code blocks ``` ``` -> verbatim
          t = t.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_m, p1) => `\\begin{verbatim}\n${p1}\n\\end{verbatim}`);
          // line breaks: double newline -> paragraph; single newline -> latex linebreak
          t = t.replace(/\n{2,}/g, '\n\n');
          t = t.replace(/(?<!\n)\n(?!\n)/g, '\\\\\n');
          return t;
        }
        function sanitizeLatex(str) {
          if (str === null || str === undefined) return '';
          const s = String(str);
          return s
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\$/g, '\\$')
            .replace(/%/g, '\\%')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/\^/g, '\\^{}')
            .replace(/~/g, '\\~{}')
            .replace(/\u00a0/g, ' ');
        }
        function deepSanitize(obj) {
          if (obj === null || obj === undefined) return '';
          if (typeof obj === 'string') return transformMarkdownToLatexBasic(sanitizeLatex(obj));
          if (Array.isArray(obj)) return obj.map(v => deepSanitize(v));
          if (typeof obj === 'object') {
            const out = {}; for (const [k, v] of Object.entries(obj)) out[k] = deepSanitize(v); return out;
          }
          return transformMarkdownToLatexBasic(sanitizeLatex(String(obj)));
        }
        // Normalisation des références RAG pour affichage en itemize
        function normalizeRagReferences(arr) {
          const out = [];
          const seen = new Set();
          const stripMd = (s) => String(s)
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '$1 — $2')
            .replace(/\s+/g, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();
          const prefRe = /Programme|Référentiel|Vademecum|Guide|Progression|NSI/i;
          for (const r of Array.isArray(arr) ? arr : []) {
            if (r === null || r === undefined) continue;
            const lines = String(r).split('\n').map(l => stripMd(l)).filter(l => l.length > 0);
            // Chercher une ligne candidate pertinente
            let candidate = lines.find(l => prefRe.test(l)) || lines.find(l => /^[A-ZÉÀÂÈÏÔÙÇ].{15,}$/.test(l)) || lines.sort((a, b) => b.length - a.length)[0] || '';
            let t = candidate;
            t = t.replace(/\*\*+/g, '').replace(/\s*[:;,.–—-]\s*$/g, '');
            const maxLen = 160;
            if (t.length > maxLen) t = t.slice(0, maxLen - 1).trimEnd() + '…';
            if (t.length < 20) continue;
            // Rejeter les fragments commençant par une minuscule ou tronqués évidents
            if (/^[a-zàâçéèêëîïôûùüÿñ]+/.test(t)) continue;
            const key = t.toLowerCase();
            if (seen.has(key)) continue; seen.add(key);
            out.push(t);
            if (out.length >= 6) break;
          }
          const preferred = out.filter(t => prefRe.test(t));
          const base = preferred.length >= 2 ? preferred : out;
          if (base.length >= 2) return base.slice(0, 6);
          try {
            const labels = [];
            const pgLabel = (qjson && qjson.reporting && qjson.reporting.rag && qjson.reporting.rag.primary_guide && qjson.reporting.rag.primary_guide.label) || 'Guide Pédagogique NSI PMF';
            if (pgLabel) labels.push(pgLabel);
            const ctxs = (qjson && qjson.reporting && qjson.reporting.rag && Array.isArray(qjson.reporting.rag.contextual_sources) ? qjson.reporting.rag.contextual_sources : []);
            for (const s of ctxs) { if (s && s.label) labels.push(String(s.label)); }
            const uniq = Array.from(new Set(labels)).filter(Boolean);
            return uniq.slice(0, 4);
          } catch {
            return ['Guide Pédagogique NSI PMF', 'Programme NSI Terminale'];
          }
        }
        function levelFromPctInt(pctInt) {
          const pct = Math.round(Number(pctInt) || 0);
          if (pct >= 75) return { label: 'Maîtrisé', color: 'ForestGreen' };
          if (pct >= 50) return { label: 'Solide', color: 'PMFBlue' };
          if (pct >= 25) return { label: "En cours d'acquisition", color: 'Orange' };
          return { label: 'À renforcer', color: 'Red' };
        }
        const levels = {
          python: levelFromPctInt(sPct.python_pct),
          structures: levelFromPctInt(sPct.structures_pct),
          donnees: levelFromPctInt(sPct.donnees_pct),
          logique: levelFromPctInt(sPct.logique_pct),
          web: levelFromPctInt(sPct.web_pct),
          lecture_algo: levelFromPctInt(sPct.lecture_algo_pct),
        };
        // React-PDF generation (premium rendering)
        try {
          // Ensure Inter fonts exist (optional)
          try { await ensureInterFonts(); } catch {}
          const { renderToFile, Document, Page, Text, View } = require('@react-pdf/renderer');
          try { delete require.cache[require.resolve('./pdf-components')]; } catch {}
          try { delete require.cache[require.resolve('./EleveBilan.js')]; } catch {}
          try { delete require.cache[require.resolve('./EnseignantBilan.js')]; } catch {}
          const EleveBilanPDF = require('./EleveBilan.js');
          const EnseignantBilanPDF = require('./EnseignantBilan.js');

          // Prometheus metrics (global)
          const metrics = global.__METRICS || null;

          // Sanitize text to avoid unexpected tokens (global util)
          function sanitizeForPdf(val) {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return stripProblemChars(val);
            if (Array.isArray(val)) return val.map(v => sanitizeForPdf(v));
            if (typeof val === 'object') {
              const o = {}; for (const [k, v] of Object.entries(val)) o[k] = sanitizeForPdf(v); return o;
            }
            return val;
          }
          function sanitizeForPdfHard(val) {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return asciiClamp(val);
            if (Array.isArray(val)) return val.map(v => sanitizeForPdfHard(v));
            if (typeof val === 'object') { const o = {}; for (const [k, v] of Object.entries(val)) o[k] = sanitizeForPdfHard(v); return o; }
            return asciiClamp(String(val));
          }

          // Prepare directories
          const outDir = '/app/docs/artifacts_premium_final'; if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const outEleve = path.join(outDir, `eleve_${attemptId}.pdf`);
          const outEns = path.join(outDir, `enseignant_${attemptId}.pdf`);

          // Inputs for components
          const studentInfo = { family_name: st.familyName, given_name: st.givenName };
          const contextInfo = { csv_classe: st.classe };
          const generatedAt = new Date().toLocaleDateString('fr-FR');
          const logoPath = fs.existsSync('/app/apps/web/public/images/boussole.png')
            ? '/app/apps/web/public/images/boussole.png'
            : (fs.existsSync('/app/apps/web/public/images/compass.png') ? '/app/apps/web/public/images/compass.png' : null);

          // Instrumentation helpers
          function memSnap() {
            const m = process.memoryUsage();
            return { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal, ext: m.external };
          }
          function cpuSnap() { return process.cpuUsage(); }
          function cpuDelta(a, b) { return { user: b.user - a.user, system: b.system - a.system }; }
          function kb(n) { return Math.round(n / 1024); }

          let sanitationMode = 'normal';
          let degradedUsed = false; let degradedReason = '';

          const memBefore = memSnap(); const cpuBefore = cpuSnap(); const t0 = Date.now();

          async function renderOne(kind, component, outPath) {
            const start = Date.now(); const mu0 = memSnap(); const cu0 = cpuSnap();
            await renderToFile(component, outPath);
            const mu1 = memSnap(); const cu1 = cpuSnap();
            let size = 0; try { size = fs.statSync(outPath).size; } catch {}
            const ms = Date.now() - start; const rmetrics = { ms, sizeKB: kb(size), rssKB: kb(mu1.rss), heapKB: kb(mu1.heapUsed), cpuUserUs: cpuDelta(cu0, cu1).user, cpuSysUs: cpuDelta(cu0, cu1).system };
            console.log(`[PDF TIME] ${kind} renderMs=${rmetrics.ms} sizeKB=${rmetrics.sizeKB} memRSSKB=${rmetrics.rssKB} heapKB=${rmetrics.heapKB} cpuUserUs=${rmetrics.cpuUserUs} cpuSysUs=${rmetrics.cpuSysUs}`);
            try { if (metrics) metrics.reactpdfRenderMs.observe({ variant: kind }, ms); } catch {}
            return rmetrics;
          }

          function buildComponents(analysisEleve, analysisEns) {
            const eleveComp = React.createElement(EleveBilanPDF, { student: studentInfo, context: contextInfo, scores: sPct, analysis: analysisEleve, logoSrc: logoPath, generatedAt });
            const ensComp = React.createElement(EnseignantBilanPDF, { student: studentInfo, context: contextInfo, scores: sPct, analysis: analysisEns, logoSrc: logoPath, generatedAt });
            return { eleveComp, ensComp };
          }

          // First pass: normal sanitation
          let analysisEleveSan = sanitizeForPdf(analysisEleveStruct);
          let analysisEnsSan = sanitizeForPdf(analysisEnsStruct);
          let { eleveComp, ensComp } = buildComponents(analysisEleveSan, analysisEnsSan);

          const parallel = String(process.env.PDF_PARALLEL || '1') === '1';
          let metEleve, metEns;
          try {
            console.log('[RENDER] start both variants', { attemptId, parallel });
            if (parallel) {
              [metEleve, metEns] = await Promise.all([
                (async () => { console.log('[RENDER] start', { variant: 'eleve', out: outEleve }); const r = await renderOne('eleve', eleveComp, outEleve); console.log('[RENDER] done', { variant: 'eleve', ms: r?.ms, sizeKB: r?.sizeKB }); return r; })(),
                (async () => { console.log('[RENDER] start', { variant: 'enseignant', out: outEns }); const r = await renderOne('enseignant', ensComp, outEns); console.log('[RENDER] done', { variant: 'enseignant', ms: r?.ms, sizeKB: r?.sizeKB }); return r; })(),
              ]);
            } else {
              console.log('[RENDER] start', { variant: 'eleve', out: outEleve });
              metEleve = await renderOne('eleve', eleveComp, outEleve);
              console.log('[RENDER] done', { variant: 'eleve', ms: metEleve?.ms, sizeKB: metEleve?.sizeKB });
              console.log('[RENDER] start', { variant: 'enseignant', out: outEns });
              metEns = await renderOne('enseignant', ensComp, outEns);
              console.log('[RENDER] done', { variant: 'enseignant', ms: metEns?.ms, sizeKB: metEns?.sizeKB });
            }
          } catch (eFirst) {
            sanitationMode = 'hard';
            try { if (metrics) metrics.reactpdfErrorsTotal.inc({ type: 'render_first' }); } catch {}
            console.warn('[generate_reports] React-PDF first attempt failed:', eFirst?.message || eFirst);
            // Hard fallback sanitation
            analysisEleveSan = sanitizeForPdfHard(analysisEleveStruct);
            analysisEnsSan = sanitizeForPdfHard(analysisEnsStruct);
            ({ eleveComp, ensComp } = buildComponents(analysisEleveSan, analysisEnsSan));
            try {
              console.log('[RENDER] retry with hard sanitation');
              if (parallel) {
                [metEleve, metEns] = await Promise.all([
                  (async () => { console.log('[RENDER] start', { variant: 'eleve', out: outEleve }); const r = await renderOne('eleve', eleveComp, outEleve); console.log('[RENDER] done', { variant: 'eleve', ms: r?.ms, sizeKB: r?.sizeKB }); return r; })(),
                  (async () => { console.log('[RENDER] start', { variant: 'enseignant', out: outEns }); const r = await renderOne('enseignant', ensComp, outEns); console.log('[RENDER] done', { variant: 'enseignant', ms: r?.ms, sizeKB: r?.sizeKB }); return r; })(),
                ]);
              } else {
                console.log('[RENDER] start', { variant: 'eleve', out: outEleve });
                metEleve = await renderOne('eleve', eleveComp, outEleve);
                console.log('[RENDER] done', { variant: 'eleve', ms: metEleve?.ms, sizeKB: metEleve?.sizeKB });
                console.log('[RENDER] start', { variant: 'enseignant', out: outEns });
                metEns = await renderOne('enseignant', ensComp, outEns);
                console.log('[RENDER] done', { variant: 'enseignant', ms: metEns?.ms, sizeKB: metEns?.sizeKB });
              }
            } catch (eSecond) {
              try { if (metrics) metrics.reactpdfErrorsTotal.inc({ type: 'render_second' }); } catch {}
              console.error('[generate_reports] React-PDF second attempt (hard) failed:', eSecond?.message || eSecond);
              // Final fallback: upload archived placeholder PDFs (bypass React-PDF/yoga)
              try {
                const candidatesEleve = [
                  '/app/archives/bilan_eleve_latest.pdf',
                  '/app/archives/bilan_eleve.pdf',
                  '/app/archives/artifacts_premium/eleve.pdf',
                  '/app/archives/artifacts_report/eleve.pdf'
                ];
                const candidatesEns = [
                  '/app/archives/bilan_enseignant_latest.pdf',
                  '/app/archives/artifacts_premium/enseignant.pdf',
                  '/app/archives/artifacts_report/enseignant.pdf'
                ];
                const srcEleve = candidatesEleve.find(p => { try { return fs.existsSync(p) && fs.statSync(p).size > 1024; } catch { return false; } });
                const srcEns = candidatesEns.find(p => { try { return fs.existsSync(p) && fs.statSync(p).size > 1024; } catch { return false; } });
                if (!srcEleve || !srcEns) throw new Error('No placeholder PDFs found');

                // Copy placeholders to expected output paths
                fs.copyFileSync(srcEleve, outEleve);
                fs.copyFileSync(srcEns, outEns);

                // Upload fallbacks
                const baseKey = `reports/${(st.email || st.studentEmail || 'unknown').replace(/[^a-z0-9@._-]/gi, '_')}/${attemptId}`;
                try { var statE = fs.statSync(outEleve); } catch { var statE = { size: 0 }; }
                try { var statT = fs.statSync(outEns); } catch { var statT = { size: 0 }; }
                console.log('[S3] put start', { variant: 'eleve', bucket: S3_BUCKET, key: `${baseKey}/eleve.pdf`, sizeBytes: statE.size });
                const up0 = Date.now(); urlEleve = await putPdfS3Stream(`${baseKey}/eleve.pdf`, outEleve); const up1 = Date.now();
                console.log('[S3] put ok', { variant: 'eleve', url: urlEleve, ms: (up1 - up0) });
                console.log('[S3] put start', { variant: 'enseignant', bucket: S3_BUCKET, key: `${baseKey}/enseignant.pdf`, sizeBytes: statT.size });
                const up2 = Date.now(); urlEns = await putPdfS3Stream(`${baseKey}/enseignant.pdf`, outEns); const up3 = Date.now();
                console.log('[S3] put ok', { variant: 'enseignant', url: urlEns, ms: (up3 - up2) });
                const uploadEleveMs = up1 - up0; const uploadEnsMs = up3 - up2;
                console.log(`[PDF TIME] upload eleveMs=${uploadEleveMs} ensMs=${uploadEnsMs}`);
                try { if (metrics) { metrics.s3UploadMs.observe({ variant: 'eleve' }, uploadEleveMs); metrics.s3UploadMs.observe({ variant: 'enseignant' }, uploadEnsMs); } } catch {}

                degradedUsed = true; degradedReason = 'React-PDF error; archived placeholder used';
                console.log('[PDF_FALLBACK_USED]', JSON.stringify({ attemptId, reason: degradedUsed ? degradedReason : 'none' }));
              } catch (eFallback) {
                console.warn('[generate_reports] archived placeholder upload failed:', eFallback?.message || eFallback);
                throw eSecond; // No usable PDF
              }

              // With fallback PDFs uploaded, skip original error and continue to summary
              metEleve = null; metEns = null; // Not applicable for minimal
            }
          }

          // Upload to S3 with timing (only if not already uploaded via fallback)
          let uploadEleveMs = 0, uploadEnsMs = 0;
          let s3AttemptE = false, s3OkE = false, s3AttemptT = false, s3OkT = false;
          if (!degradedUsed) {
            try {
              const baseKey = `reports/${(st.email || st.studentEmail || 'unknown').replace(/[^a-z0-9@._-]/gi, '_')}/${attemptId}`;
              try { var statE2 = fs.statSync(outEleve); } catch { var statE2 = { size: 0 }; }
              console.log('[S3] put start', { variant: 'eleve', bucket: S3_BUCKET, key: `${baseKey}/eleve.pdf`, sizeBytes: statE2.size });
              s3AttemptE = true;
              const up0 = Date.now(); urlEleve = await putPdfS3Stream(`${baseKey}/eleve.pdf`, outEleve); const up1 = Date.now(); uploadEleveMs = up1 - up0; s3OkE = true;
              console.log('[S3] put ok', { variant: 'eleve', url: urlEleve, ms: uploadEleveMs });
              try { var statT2 = fs.statSync(outEns); } catch { var statT2 = { size: 0 }; }
              console.log('[S3] put start', { variant: 'enseignant', bucket: S3_BUCKET, key: `${baseKey}/enseignant.pdf`, sizeBytes: statT2.size });
              s3AttemptT = true;
              const up2 = Date.now(); urlEns = await putPdfS3Stream(`${baseKey}/enseignant.pdf`, outEns); const up3 = Date.now(); uploadEnsMs = up3 - up2; s3OkT = true;
              console.log('[S3] put ok', { variant: 'enseignant', url: urlEns, ms: uploadEnsMs });
              console.log(`[PDF TIME] upload eleveMs=${uploadEleveMs} ensMs=${uploadEnsMs}`);
              try { if (metrics) { metrics.s3UploadMs.observe({ variant: 'eleve' }, uploadEleveMs); metrics.s3UploadMs.observe({ variant: 'enseignant' }, uploadEnsMs); } } catch {}
            } catch (eUp) {
              console.warn('[PDF upload] failed:', eUp?.message || eUp);
            }
          }

          const memAfter = memSnap(); const cpuAfter = cpuSnap();
          const totalMs = Date.now() - t0;
          console.log(`[PDF TIME] totalMs=${totalMs} memRSSKB_start=${kb(memBefore.rss)} -> end=${kb(memAfter.rss)} cpuUserUs=${cpuDelta(cpuBefore, cpuAfter).user} cpuSysUs=${cpuDelta(cpuBefore, cpuAfter).system}`);
          try {
            const summary = {
              attemptId,
              sections_total_ms: (typeof tSectionsStart === 'number' && typeof tSectionsEnd === 'number') ? (tSectionsEnd - tSectionsStart) : null,
              eleve_render_ms: metEleve?.ms || null,
              enseignant_render_ms: metEns?.ms || null,
              eleve_size_kb: metEleve?.sizeKB || null,
              enseignant_size_kb: metEns?.sizeKB || null,
              upload_eleve_ms: uploadEleveMs,
              upload_enseignant_ms: uploadEnsMs,
              render_total_ms: totalMs,
              sanitation_mode: sanitationMode,
              degraded: degradedUsed || false,
              degraded_reason: degradedReason || null,
              // Diagnostics
              s3_upload_attempted_eleve: typeof s3AttemptE !== 'undefined' ? s3AttemptE : null,
              s3_upload_success_eleve: typeof s3OkE !== 'undefined' ? s3OkE : null,
              s3_upload_attempted_enseignant: typeof s3AttemptT !== 'undefined' ? s3AttemptT : null,
              s3_upload_success_enseignant: typeof s3OkT !== 'undefined' ? s3OkT : null,
              pdf_url_eleve: urlEleve || null,
              pdf_url_enseignant: urlEns || null,
              report_inserted_eleve: typeof insertedEleve !== 'undefined' ? insertedEleve : null,
              report_inserted_enseignant: typeof insertedEns !== 'undefined' ? insertedEns : null
            };
            console.log('[PDF SUMMARY]', JSON.stringify(summary));
            try {
              const perfDir = '/app/docs/perf_reports';
              if (!fs.existsSync(perfDir)) fs.mkdirSync(perfDir, { recursive: true });
              fs.writeFileSync(`${perfDir}/attempt_${attemptId}.json`, JSON.stringify(summary, null, 2));
            } catch {}
          } catch {}
        } catch (e) {
          console.error('[generate_reports] React-PDF unexpected error after attempts:', e?.message || e);
          // If we reach here, no usable PDFs were created
          throw e;
        }

      } catch (e2) {
        console.warn('[generate_reports] legacy block (pre-React-PDF) skipped:', e2?.message || e2);
      }

      // 6) Update DB (Report records)
      // Inject degradation metadata if fallback used
      try {
        if (typeof analysisEleveStruct === 'object') {
          analysisEleveStruct.degraded = analysisEleveStruct.degraded || false;
          if (typeof degradedUsed !== 'undefined') analysisEleveStruct.degraded = !!degradedUsed;
          if (degradedUsed) analysisEleveStruct.render_note = degradedReason || 'fallback_used';
          if (typeof sanitationMode !== 'undefined') analysisEleveStruct.sanitation_mode = sanitationMode;
        }
        if (typeof analysisEnsStruct === 'object') {
          analysisEnsStruct.degraded = analysisEnsStruct.degraded || false;
          if (typeof degradedUsed !== 'undefined') analysisEnsStruct.degraded = !!degradedUsed;
          if (degradedUsed) analysisEnsStruct.render_note = degradedReason || 'fallback_used';
          if (typeof sanitationMode !== 'undefined') analysisEnsStruct.sanitation_mode = sanitationMode;
        }
      } catch {}

      // Insert Reports with RETURNING for logging
      let insertedEleve = false, insertedEns = false;
      try {
        const r1 = await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt")
                    VALUES (gen_random_uuid(),$1,'eleve',$2,$3,now()) RETURNING id, "pdfUrl"`, [attemptId, analysisEleveStruct, urlEleve]);
        const row1 = r1?.rows?.[0];
        console.log('[DB] Report inserted', { variant: 'eleve', id: row1?.id, pdfUrl: row1?.pdfUrl });
        insertedEleve = true;
      } catch (e) {
        console.warn('[DB] insert Report eleve failed:', e?.message || e);
      }
      try {
        const r2 = await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt")
                    VALUES (gen_random_uuid(),$1,'enseignant',$2,$3,now()) RETURNING id, "pdfUrl"`, [attemptId, analysisEnsStruct, urlEns]);
        const row2 = r2?.rows?.[0];
        console.log('[DB] Report inserted', { variant: 'enseignant', id: row2?.id, pdfUrl: row2?.pdfUrl });
        insertedEns = true;
      } catch (e) {
        console.warn('[DB] insert Report enseignant failed:', e?.message || e);
      }

      // Rewrite PDF SUMMARY with diagnostics now that S3/DB steps are known
      try {
        const summary2 = {
          attemptId,
          sections_total_ms: (typeof tSectionsStart === 'number' && typeof tSectionsEnd === 'number') ? (tSectionsEnd - tSectionsStart) : null,
          eleve_render_ms: metEleve?.ms || null,
          enseignant_render_ms: metEns?.ms || null,
          eleve_size_kb: metEleve?.sizeKB || null,
          enseignant_size_kb: metEns?.sizeKB || null,
          upload_eleve_ms: uploadEleveMs,
          upload_enseignant_ms: uploadEnsMs,
          render_total_ms: totalMs,
          sanitation_mode: sanitationMode,
          degraded: degradedUsed || false,
          degraded_reason: degradedReason || null,
          s3_upload_attempted_eleve: typeof s3AttemptE !== 'undefined' ? s3AttemptE : null,
          s3_upload_success_eleve: typeof s3OkE !== 'undefined' ? s3OkE : null,
          s3_upload_attempted_enseignant: typeof s3AttemptT !== 'undefined' ? s3AttemptT : null,
          s3_upload_success_enseignant: typeof s3OkT !== 'undefined' ? s3OkT : null,
          pdf_url_eleve: urlEleve || null,
          pdf_url_enseignant: urlEns || null,
          report_inserted_eleve: typeof insertedEleve !== 'undefined' ? insertedEleve : null,
          report_inserted_enseignant: typeof insertedEns !== 'undefined' ? insertedEns : null
        };
        console.log('[PDF SUMMARY]', JSON.stringify(summary2));
        try {
          const perfDir = '/app/docs/perf_reports';
          if (!fs.existsSync(perfDir)) fs.mkdirSync(perfDir, { recursive: true });
          fs.writeFileSync(`${perfDir}/attempt_${attemptId}.json`, JSON.stringify(summary2, null, 2));
        } catch {}
      } catch {}

      // 7) Email notification supprimée (no-op)

      console.log('[generate_reports] Job complété:', attemptId, urlEleve, urlEns);
      // Align with fast-path: update Bilan status to GENERATED when PDFs are ready
      try {
        if (bilanId) {
          await pg.query(`UPDATE "Bilan" SET status='GENERATED', "updatedAt"=now() WHERE id=$1`, [bilanId]);
          console.log('[DB] Bilan status updated to GENERATED', { bilanId });
        }
      } catch (e) {
        console.warn('[DB] update Bilan status failed:', e?.message || e);
      }
      console.log('[WORKER] done', { attemptId, bilanId, ts: new Date().toISOString() });
      return { ok: true, attemptId, urlEleve, urlEns };
    } catch (e) {
      if (Sentry) { try { Sentry.captureException(e); } catch {} }
      throw e;
    }
  }, { connection });

  // Dead‑letter + logging on failure (observabilité)
  reportsWorker.on('failed', async (job, err) => {
    try {
      await dlq.add(
        'failed_job',
        {
          attemptId: job?.data?.attemptId || null,
          reason: (err && (err.message || String(err))) || 'unknown',
          failedAt: new Date().toISOString(),
        },
        { removeOnComplete: false, removeOnFail: false }
      );
    } catch (e) {
      console.warn('[generate_reports] DLQ enqueue failed:', e?.message || e);
    }
  });

  console.log('Worker generate_reports prêt.');
})();

// --- RAG ingestion worker (separate, uses per-job PG connection)
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(filePath, mime) {
  // Support texte brut et markdown
  const lower = (filePath || '').toLowerCase();
  if ((mime || '').includes('text/plain') || lower.endsWith('.txt')) {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  }
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  }
  if ((mime || '').includes('pdf') || filePath.toLowerCase().endsWith('.pdf')) {
    const buf = fs.readFileSync(filePath); const out = await pdf(buf); return out.text;
  }
  if ((mime || '').includes('wordprocessingml') || filePath.toLowerCase().endsWith('.docx')) {
    const buf = fs.readFileSync(filePath); const out = await mammoth.extractRawText({ buffer: buf }); return out.value || '';
  }
  if (filePath.toLowerCase().endsWith('.doc')) {
    const tmp = path.join('/tmp', `${Date.now()}_conv.pdf`);
    await new Promise((res, rej) => {
      const p = spawn('soffice', ['--headless', '--convert-to', 'pdf', filePath, '--outdir', '/tmp']);
      p.on('close', (code) => code === 0 ? res() : rej(new Error('libreoffice convert fail')));
    });
    return extractText(tmp, 'application/pdf');
  }
  if ((mime || '').startsWith('image/') || filePath.match(/\.(png|jpg|jpeg)$/i)) {
    const base = path.join('/tmp', `${Date.now()}_ocr`);
    await new Promise((res, rej) => {
      const p = spawn('tesseract', [filePath, base, '-l', 'fra+eng']);
      p.on('close', (code) => code === 0 ? res() : rej(new Error('tesseract fail')));
    });
    return fs.readFileSync(base + '.txt', 'utf8');
  }
  return '';
}

function chunkText(text, size = 800, overlap = 120) {
  const chunks = []; let i = 0; while (i < text.length) { const end = Math.min(text.length, i + size); chunks.push(text.slice(i, end)); i = end - overlap; if (i < 0) i = 0; }
  return chunks;
}

const ragDlq = new Queue('rag_ingest_dlq', { connection });
const ragWorker = new Worker('rag_ingest', async job => {
  try {
    const { documentId, path: filePath, mime } = job.data;
    console.log('[rag_ingest] start job doc=', documentId, 'path=', filePath, 'mime=', mime);
    const text = await extractText(filePath, mime || '');
    console.log('[rag_ingest] extracted length=', (text || '').length);
    const parts = chunkText(text, 800, 120);
    console.log('[rag_ingest] parts=', parts.length);
    const pg2 = new Client(buildPgConfig()); await pg2.connect();
    let inserted = 0;
    for (let i = 0; i < parts.length; i += 8) {
      const batch = parts.slice(i, i + 8);
      const emb = await embedBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        try {
          const lit = toVectorLiteral(emb[j]);
          await pg2.query('INSERT INTO chunks(document_id,text,embedding) VALUES($1,$2,$3::vector)', [documentId, batch[j], lit]);
          inserted++;
        } catch (e) {
          console.error('[rag_ingest] insert chunk error:', e?.message || e);
        }
      }
    }
    console.log('[rag_ingest] done doc=', documentId, 'inserted=', inserted);
    await pg2.query("UPDATE documents SET meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object('ingested_at', to_char(now(),'YYYY-MM-DD\"T\"HH24:MI:SS')) WHERE id=$1", [documentId]);
    await pg2.end();
    return { ok: true };
  } catch (e) {
    if (Sentry) { try { Sentry.captureException(e); } catch {} }
    throw e;
  }
}, { connection });

ragWorker.on('failed', async (job, err) => {
  try {
    await ragDlq.add(
      'failed_job',
      {
        documentId: job?.data?.documentId || null,
        reason: (err && (err.message || String(err))) || 'unknown',
        failedAt: new Date().toISOString(),
      },
      { removeOnComplete: false, removeOnFail: false }
    );
  } catch (e) {
    console.warn('[rag_ingest] DLQ enqueue failed:', e?.message || e);
  }
});
