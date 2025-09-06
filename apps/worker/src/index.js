// --- Imports & env
try { require('dotenv').config({ path: '.env.local' }); } catch {}
const { Queue, Worker } = require('bullmq');
const fetch = global.fetch ? global.fetch : (...args) => import('node-fetch').then(m => m.default(...args));
const { Client } = require('pg');
const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Env
const {
  REDIS_URL, DATABASE_URL,
  HF_TOKEN, OPENAI_API_KEY,
  EMBEDDING_PROVIDER, GEMINI_API_KEY, GEMINI_EMBEDDINGS_MODEL, VECTOR_DIM,
  S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION,
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
} = process.env;

// --- Infra clients
const connection = { url: REDIS_URL };
const q = new Queue('generate_reports', { connection });
const pg = new Client({ connectionString: DATABASE_URL });
const mailer = nodemailer.createTransport({
  host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: String(SMTP_SECURE) === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});
const s3 = new S3Client({
  region: S3_REGION, endpoint: S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY }
});

// --- Helpers
function toVectorLiteral(vec) { return '[' + vec.map(x => Number(x).toFixed(6)).join(',') + ']'; }
async function embedBatch(texts) {
  if ((EMBEDDING_PROVIDER || 'gemini') === 'gemini') {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004') + ':embedContent?key=' + encodeURIComponent(GEMINI_API_KEY || '');
    const body = { inputs: texts.map(t => ({ content: { parts: [{ text: t }] } })) };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    const vectors = (data.embeddings || data.batchEmbeddings || data?.results || []).map(e => (e.values || e.embedding || e)?.values || e);
    return vectors.map(v => { const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); const target = Number(VECTOR_DIM || 768); if (out.length < target) out = out.concat(Array(target - out.length).fill(0)); if (out.length > target) out = out.slice(0, target); return out; });
  }
  const url = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(texts) });
  const arr = await res.json();
  return arr.map(v => { const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); const target = Number(VECTOR_DIM || 384); if (out.length < target) out = out.concat(Array(target - out.length).fill(0)); if (out.length > target) out = out.slice(0, target); return out; });
}
async function openaiJSON(systemPrompt, userPrompt, model = 'gpt-4o') {
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
    const data = await res.json();
    const txt = data.choices?.[0]?.message?.content || '{}';
    try { return JSON.parse(txt); } catch { return {}; }
  } catch (e) {
    console.warn('[generate_reports] openaiJSON error:', e?.message || e);
    return {};
  }
}
function fillTemplate(tex, dict) {
  // Support both {{key}} and {{{key}}} placeholders
  return tex.replace(/\{\{\{?\s*([\w\.\_]+)\s*\}?\}\}/g, (_, key) => {
    const parts = key.split('.');
    let v = dict;
    for (const p of parts) { v = (v ?? {})[p]; if (v === undefined) return ''; }
    return String(v);
  });
}
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
    if (/\{\{.*\}\}/.test(value)) return fillTemplate(value, dict);
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
function latexmk(texString, outDir) {
  const texPath = path.join(outDir, 'report.tex');
  fs.writeFileSync(texPath, texString, 'utf8');
  return new Promise((resolve, reject) => {
    const proc = spawn('latexmk', ['-pdf', '-halt-on-error', '-interaction=nonstopmode', 'report.tex'], { cwd: outDir });
    let stderr = ''; proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(path.join(outDir, 'report.pdf'));
      else reject(new Error('latexmk failed:\n' + stderr));
    });
  });
}
async function putPdfS3(key, filePath) {
  const Body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body, ContentType: 'application/pdf' }));
  return `s3://${S3_BUCKET}/${key}`;
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
  for (const t of results) { if (!seen.has(t)) { seen.add(t); unique.push(t); } if (unique.length >= 12) break; }
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

// --- Email helper
async function sendMail(to, subject, text, attachments) {
  return mailer.sendMail({ from: SMTP_FROM, to, subject, text, attachments });
}

// --- Main worker
(async () => {
  await pg.connect();
  new Worker('generate_reports', async job => {
    const { attemptId } = job.data;

    // 1) Fetch attempt + student + scores
    const a = await pg.query(`SELECT a.id, a."studentId", s.email, s."givenName", s."familyName", s.classe
                               FROM "Attempt" a JOIN "Student" s ON s.id=a."studentId" WHERE a.id=$1`, [attemptId]);
    if (a.rowCount === 0) throw new Error('Attempt introuvable');
    const st = a.rows[0];
    console.log('[generate_reports] Élève sélectionné:', st.familyname || st.familyName, st.givenname || st.givenName, 'Classe:', st.classe, 'Attempt:', attemptId);
    const sc = await pg.query(`SELECT domain, pct FROM "Score" WHERE "attemptId"=$1`, [attemptId]);
    const scores = Object.fromEntries(sc.rows.map(r => [r.domain, Number(r.pct)]));

    // 2) Retrieval RAG
    const queries = buildQueriesFromScores(scores);
    const rag = await retrieveChunks(queries);

    // 3) Charger questionnaire & Pré-analyse
    const qjson = loadQuestionnaire();
    const sysEleve = qjson.reporting.prompts.system_eleve;
    const sysEns = qjson.reporting.prompts.system_enseignant;

    // Dictionnaire de base pour templating
    const dict = {
      auth: { given_name: st.givenname || st.givenName, family_name: st.familyname || st.familyName },
      context: { csv_classe: st.classe, student_id: st.studentid || st.studentId },
      scoring: { sections: { volet_connaissances: scores } },
      answers: {},
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
          const miniModel = step.model || 'gpt-4o-mini';
          const out = await openaiJSON('Tu es un assistant qui produit du JSON.', `${step.prompt}\n\nDonnées:\n${JSON.stringify(userPayload)}`, miniModel);
          const varPath = step.output_variable || 'pre_analysis.summary';
          setByPath(dict, varPath, out);
          console.log('[generate_reports] Pré-analyse (', miniModel, '):', JSON.stringify(out, null, 2));
        } catch (e) {
          console.warn('[generate_reports] Pré-analyse échouée:', e?.message || e);
        }
      }
    }

    // Construire payload final depuis reporting.inputs
    const inputsSpec = (qjson.reporting && qjson.reporting.inputs) || {};
    const payload = deepTemplate(inputsSpec, dict);
    payload.rag = rag;
    console.log('[generate_reports] Payload final (extrait):', JSON.stringify({
      student: payload.student,
      context: payload.context,
      text_summary: payload.text_summary,
      keys: Object.keys(payload)
    }, null, 2));

    // 4) Prompts finaux (LLM)
    const analysisEleve = await openaiJSON(sysEleve, JSON.stringify(payload), qjson.reporting.model || 'gpt-4o');
    const analysisEns = await openaiJSON(sysEns, JSON.stringify(payload), qjson.reporting.model || 'gpt-4o');

    // 4) LaTeX templates
    const dataForTpl = {
      student: { family_name: st.familyName, given_name: st.givenName },
      context: { csv_classe: st.classe },
      scores: {
        python_pct: Math.round((scores.python || 0) * 100),
        structures_pct: Math.round((scores.structures || 0) * 100),
        donnees_pct: Math.round((scores.donnees || 0) * 100),
        logique_pct: Math.round((scores.logique || 0) * 100),
        web_pct: Math.round((scores.web || 0) * 100),
        lecture_algo_pct: Math.round((scores.lecture_algo || 0) * 100)
      },
      analysis: {
        strengths_eleve: analysisEleve.strengths_eleve || '',
        remediations_eleve: analysisEleve.remediations_eleve || '',
        methodes_conseils: analysisEleve.methodes_conseils || '',
        objectifs_eleve: analysisEleve.objectifs_eleve || '',
        ressources: analysisEleve.ressources || '',
        gestes_commentaires: analysisEns.gestes_commentaires || '',
        alertes_recos: analysisEns.alertes_recos || '',
        plan_4_semaines: analysisEns.plan_4_semaines || ''
      },
      class_stats: { domain_means: '-', tag_rates: '-', sequence_recos: '-' }
    };

    const texEleve = fillTemplate(qjson.reporting.latex_templates.eleve, dataForTpl);
    const texEns = fillTemplate(qjson.reporting.latex_templates.enseignant, dataForTpl);

    let urlEleve = '';
    let urlEns = '';
    try {
      const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nsi-'));
      const pdfEleve = await latexmk(texEleve, tmpDir);
      const pdfEns = await latexmk(texEns, tmpDir);
      // 5) Upload MinIO (optionnel)
      try {
        const baseKey = `reports/${st.studentId || 'unknown'}/${attemptId}`;
        const keyEleve = `${baseKey}/eleve.pdf`;
        const keyEns = `${baseKey}/enseignant.pdf`;
        urlEleve = await putPdfS3(keyEleve, pdfEleve);
        urlEns = await putPdfS3(keyEns, pdfEns);
      } catch (e) {
        console.warn('[generate_reports] Upload S3 ignoré:', e?.message || e);
      }
    } catch (e) {
      console.warn('[generate_reports] Compilation LaTeX ignorée:', e?.message || e);
    }

    // 6) Update DB (Report records)
    await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt")
                    VALUES (gen_random_uuid(),$1,'eleve',$2,$3,now())`, [attemptId, analysisEleve, urlEleve]);
    await pg.query(`INSERT INTO "Report"(id,"attemptId",type,json,"pdfUrl","publishedAt")
                    VALUES (gen_random_uuid(),$1,'enseignant',$2,$3,now())`, [attemptId, analysisEns, urlEns]);

    // 7) Email notification (liens)
    const subject = `Bilan NSI Terminale — ${st.familyName} ${st.givenName}`;
    const body = `Bilans générés:\n- Élève: ${urlEleve}\n- Enseignant: ${urlEns}\n`;
    try {
      await sendMail(st.email, subject, body, []);
    } catch (e) { console.warn('[generate_reports] Email élève ignoré:', e?.message || e); }
    try {
      await sendMail('alaeddine.benrhouma@ert.tn, pierre.caillabet@ert.tn', subject, body, []);
    } catch (e) { console.warn('[generate_reports] Email enseignants ignoré:', e?.message || e); }

    return { ok: true, attemptId, urlEleve, urlEns };
  }, { connection });

  console.log('Worker generate_reports prêt.');
})();

// --- RAG ingestion worker (separate, uses per-job PG connection)
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(filePath, mime) {
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

function chunkText(text, size = 1400, overlap = 200) {
  const chunks = []; let i = 0; while (i < text.length) { const end = Math.min(text.length, i + size); chunks.push(text.slice(i, end)); i = end - overlap; if (i < 0) i = 0; }
  return chunks;
}

new Worker('rag_ingest', async job => {
  const { documentId, path: filePath, mime } = job.data;
  const text = await extractText(filePath, mime || '');
  const parts = chunkText(text, 1400, 200);
  const pg2 = new Client({ connectionString: process.env.DATABASE_URL }); await pg2.connect();
  for (let i = 0; i < parts.length; i += 16) {
    const batch = parts.slice(i, i + 16);
    const emb = await embedBatchHF(batch);
    for (let j = 0; j < batch.length; j++) {
      await pg2.query('INSERT INTO chunks(document_id,text,embedding) VALUES($1,$2,$3)', [documentId, batch[j], emb[j]]);
    }
  }
  await pg2.query("UPDATE documents SET meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object('ingested_at', to_char(now(),'YYYY-MM-DD\"T\"HH24:MI:SS')) WHERE id=$1", [documentId]);
  await pg2.end();
  return { ok: true };
}, { connection });
