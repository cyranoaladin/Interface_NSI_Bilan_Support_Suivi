// --- Imports & env
try { require('dotenv').config({ path: '.env.local' }); } catch {}
const { Queue, Worker } = require('bullmq');
const fetch = global.fetch ? global.fetch : (...args) => import('node-fetch').then(m => m.default(...args));
const { Client } = require('pg');
const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const React = require('react');
const { renderToFile, Font } = require('@react-pdf/renderer');
const EleveBilanPDF = require('./EleveBilan.js');
const EnseignantBilanPDF = require('./EnseignantBilan.js');
const { validateBilanData } = require('./validator.js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('./logger.js');
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
      { url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter-Regular.ttf', path: dir + '/inter-400.ttf' },
      { url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter-Bold.ttf', path: dir + '/inter-700.ttf' },
    ];
    for (const f of files) {
      if (!fs.existsSync(f.path) || fs.statSync(f.path).size < 10000) {
        const res = await fetch(f.url);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(f.path, buf);
      }
    }
    Font.register({ family: 'Inter', src: dir + '/inter-400.ttf', fontWeight: 400 });
    Font.register({ family: 'Inter', src: dir + '/inter-700.ttf', fontWeight: 700 });
  } catch (e) {
    console.warn('[worker] Inter font setup failed, using defaults:', e?.message || e);
  }
}

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
const q = new Queue('generate_reports', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
const dlq = new Queue('generate_reports_dlq', { connection });
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
async function geminiJSON(systemPrompt, userPrompt, model = 'gemini-1.5-flash') {
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

async function llmJSON(systemPrompt, userPrompt) {
  // Try OpenAI then Gemini fallback
  const o = await openaiJSON(systemPrompt, userPrompt, process.env.OPENAI_MODEL || 'gpt-4o');
  if (o && Object.keys(o).length > 0) return o;
  const g = await geminiJSON(systemPrompt, userPrompt, process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash');
  return g;
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

// --- Email helper
async function sendMail(to, subject, text, attachments) {
  return mailer.sendMail({ from: SMTP_FROM, to, subject, text, attachments });
}

// --- Main worker
(async () => {
  await pg.connect();
  const reportsWorker = new Worker('generate_reports', async job => {
    try {
      const { attemptId } = job.data;

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
        const guidePath = '/app/GUIDE_PEDAGOGIQUE_NSI_PMF.md';
        if (fs.existsSync(guidePath)) {
          const guideText = fs.readFileSync(guidePath, 'utf8');
          if (guideText && typeof guideText === 'string') {
            rag.unshift(guideText.slice(0, 12000)); // limite de sécurité
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
      // Lecture du guide primaire depuis reporting.rag.primary_guide
      const guidePath = (qjson.reporting && qjson.reporting.rag && qjson.reporting.rag.primary_guide && qjson.reporting.rag.primary_guide.path) || 'IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md';
      let guideContent = '';
      try { if (fs.existsSync(guidePath)) guideContent = fs.readFileSync(guidePath, 'utf8'); } catch {}
      // Extraits RAG (semanticSearch) sur la base indexée (guide + programmes)
      payload.rag_context = rag;
      console.log('[generate_reports] Payload final (extrait):', JSON.stringify({
        student: payload.student,
        context: payload.context,
        text_summary: payload.text_summary,
        keys: Object.keys(payload)
      }, null, 2));

      // 4) Prompts finaux (LLM) avec fallback OpenAI -> Gemini
      // Forcer réponse JSON structurée (incluant rag_references)
      const sysGuideBlock = guideContent ? `\n\n--- GUIDE PÉDAGOGIQUE (TA SOURCE DE VÉRITÉ ABSOLUE) ---\n${guideContent}` : '';
      const sysEleveJSON = `${sysEleveBase}${sysGuideBlock}\n\nIMPORTANT: Tu t'adresses DIRECTEMENT à l'élève en le tutoyant ("tu", "tes", "ta"). Ne parle JAMAIS de lui à la 3e personne. Réponds STRICTEMENT en JSON valide avec les clés exactes: introduction, analyse_competences, profil_apprentissage, plan_action, conclusion, rag_references. Pour plan_action: RENOMME en en-tête "Ta feuille de route pour les 4 prochaines semaines" et structure par semaine (S1..S4), avec 2 à 3 actions concrètes par semaine. Chaque action doit être DIRECTEMENT liée à un domaine faible. TU DOIS te baser sur les extraits RAG fournis; dans rag_references, cite 2–3 concepts clés issus des extraits utilisés.`;
      const sysEnsJSON = `${sysEnsBase}${sysGuideBlock}\n\nIMPORTANT: Réponds STRICTEMENT en JSON valide avec les clés exactes: synthese_profil, diagnostic_pedagogique, plan_4_semaines, indicateurs_pedago, rag_references. Priorise selon les scores les plus faibles et sois TRÈS spécifique (ex: listes chaînées, arbres binaires) en citant le guide. TU DOIS te baser sur les extraits RAG; dans rag_references, cite 2–3 concepts clés issus des extraits utilisés.`;
      const userPayload = {
        student: payload.student,
        context: payload.context,
        scores: payload.scores_connaissances || payload.scores || scores,
        tags: payload.tags,
        text_summary: payload.text_summary,
        rag_extraits: payload.rag_context
      };
      const analysisEleve = await llmJSON(sysEleveJSON, JSON.stringify(userPayload));
      const analysisEns = await llmJSON(sysEnsJSON, JSON.stringify(userPayload));
      // Fallbacks si vides
      function buildFallbackEleve(sc) {
        const top = Object.entries(sc || {}).filter(([k, v]) => typeof v === 'number');
        const best = top.slice().sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} (${Math.round(v * 100)}%)`).join(', ');
        const worst = top.slice().sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k, v]) => `${k} (${Math.round(v * 100)}%)`).join(', ');
        return {
          introduction: 'Bienvenue dans ton bilan personnalisé de NSI. Nous allons mobiliser les prérequis de Première pour bien démarrer l’année et t’accompagner pas à pas.',
          analyse_competences: best ? `Points forts repérés: ${best}.` : 'Points forts en cours de consolidation. Les acquis seront stabilisés en début de trimestre.',
          profil_apprentissage: 'Séances courtes, alternance cours/pratique, prise de notes soignée et auto‑évaluation régulière.',
          plan_action: '* 3 sessions de 25–30 min par semaine\n* Revoir les listes/dictionnaires\n* Exercices ciblés CSV et boucles\n* Restitution par petits quiz sur Google Classroom',
          conclusion: 'Nous te félicitons pour ton engagement. Avec une progression régulière et des objectifs concrets, tu vas rapidement consolider tes bases.',
          rag_references: ['Prérequis de Première NSI', 'Types Abstraits de Données — piles et files']
        };
      }
      function buildFallbackEns(sc) {
        const weak = Object.entries(sc || {}).filter(([_, v]) => Number(v) < 0.7).map(([k]) => k).join(', ') || '—';
        return {
          synthese_profil: 'Nous observons un profil en progression, motivé, avec des habitudes de travail à structurer (séquences courtes, feedback).',
          diagnostic_pedagogique: `Faiblesses prioritaires: ${weak}. Relier aux premiers chapitres (structures, CSV, lecture d’algorithmes).`,
          plan_4_semaines: 'S1: réactivation Python/structures; S2: CSV/nettoyage; S3: lecture/complexité; S4: mini‑projet guidé',
          indicateurs_pedago: 'Planification, décomposition, tests, restitution active. Traces d’auto‑évaluation hebdomadaires.',
          rag_references: ['Progression Terminale — début d’année', 'Pré-requis: TAD (piles, files)']
        };
      }
      const analysisEleveFinal = analysisEleve && Object.keys(analysisEleve).length ? analysisEleve : buildFallbackEleve(scores);
      // Fallback robuste: si plan_action vide, générer une feuille de route S1..S4 basée sur scores
      function buildWeeklyPlan(sc) {
        const weak = Object.entries(sc || {}).filter(([_, v]) => Number(v) < 0.5).map(([k]) => k);
        const strong = Object.entries(sc || {}).filter(([_, v]) => Number(v) >= 0.75).map(([k]) => k);
        const pick = (arr, d) => arr.includes(d);
        const s1 = `Semaine 1 — Python/Structures: 1) Revois les boucles et compréhensions (3 exos). 2) Fiche mémo sur listes/dictionnaires (20 min). 3) Mini‑exercice application.`;
        const s2 = `Semaine 2 — Données/CSV: 1) Lire/écrire un CSV (2 exos). 2) Nettoyage (strip, split) sur petit dataset. 3) Restitution courte.`;
        const s3 = `Semaine 3 — Lecture d’algorithmes/Logique: 1) Tracer 2 algos (papier). 2) Complexité (2 questions). 3) Quizz flash (10 min).`;
        const s4 = `Semaine 4 — Consolidation ciblée: 1) Exercices sur domaines faibles (${weak.join(', ') || '—'}). 2) Mini‑projet guidé (30–45 min). 3) Auto‑évaluation.`;
        return [s1, s2, s3, s4].join('\n\n');
      }
      if (!analysisEleveFinal || !analysisEleveFinal.plan_action || String(analysisEleveFinal.plan_action).trim().length === 0) {
        if (analysisEleveFinal) analysisEleveFinal.plan_action = buildWeeklyPlan(scores);
      }
      const analysisEnsFinal = analysisEns && Object.keys(analysisEns).length ? analysisEns : buildFallbackEns(scores);

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
        analyse_competences: stringifyValue(analysisEleveFinal.analyse_competences || analysisEleveFinal.strengths_eleve || ''),
        profil_apprentissage: stringifyValue(analysisEleveFinal.profil_apprentissage || ''),
        plan_action: stringifyPlan(analysisEleveFinal.plan_action || analysisEleveFinal.methodes_conseils || ''),
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

      // Validation stricte
      try {
        validateBilanData(analysisEleveStruct, sPct);
        validateBilanData(analysisEnsStruct, sPct);
      } catch (ve) {
        console.error('[generate_reports] Validation échouée:', ve?.message || ve);
        throw ve;
      }

      // 4) LaTeX remnants (domainLines for fallback text if needed)
      function badge(p) { if (p >= 80) return '🟩'; if (p >= 60) return '🟨'; return '🟥'; }
      const domainLines = [
        `Python: ${sPct.python_pct}% ${badge(sPct.python_pct)}`,
        `Structures: ${sPct.structures_pct}% ${badge(sPct.structures_pct)}`,
        `Données: ${sPct.donnees_pct}% ${badge(sPct.donnees_pct)}`,
        `Logique & Encodage: ${sPct.logique_pct}% ${badge(sPct.logique_pct)}`,
        `Web/HTTP: ${sPct.web_pct}% ${badge(sPct.web_pct)}`,
        `Lecture d’algorithmes: ${sPct.lecture_algo_pct}% ${badge(sPct.lecture_algo_pct)}`,
      ].join('\n');
      const dataForTpl = {
        student: { family_name: st.familyName, given_name: st.givenName },
        context: { csv_classe: st.classe },
        scores: sPct,
        analysis_eleve: analysisEleveStruct,
        analysis_enseignant: analysisEnsStruct,
        domainLines,
        class_stats: { domain_means: '-', tag_rates: '-', sequence_recos: '-' }
      };

      let urlEleve = '';
      let urlEns = '';
      try {
        await ensureInterFonts();
        const baseTmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nsi-reactpdf-'));
        const elevePath = path.join(baseTmp, 'eleve.pdf');
        const ensPath = path.join(baseTmp, 'enseignant.pdf');
        const logoPath = '/app/apps/web/public/images/logo_pmf.png';
        const generatedAt = new Date().toISOString().slice(0, 10);
        console.log('[generate_reports] Compilation PDF élève: start ->', elevePath);
        await renderToFile(React.createElement(EleveBilanPDF, {
          student: dataForTpl.student,
          context: dataForTpl.context,
          scores: sPct,
          analysis: dataForTpl.analysis_eleve,
          logoSrc: fs.existsSync(logoPath) ? logoPath : null,
          generatedAt,
        }), elevePath);
        console.log('[generate_reports] Compilation PDF élève: done ->', elevePath);
        console.log('[generate_reports] Compilation PDF enseignant: start ->', ensPath);
        await renderToFile(React.createElement(EnseignantBilanPDF, {
          student: dataForTpl.student,
          context: dataForTpl.context,
          scores: sPct,
          analysis: dataForTpl.analysis_enseignant,
          logoSrc: fs.existsSync(logoPath) ? logoPath : null,
          generatedAt,
        }), ensPath);
        console.log('[generate_reports] Compilation PDF enseignant: done ->', ensPath);
        try {
          const baseKey = `reports/${(st.email || st.studentEmail || 'unknown').replace(/[^a-z0-9@._-]/gi, '_')}/${attemptId}`;
          const keyEleve = `${baseKey}/eleve.pdf`;
          const keyEns = `${baseKey}/enseignant.pdf`;
          urlEleve = await putPdfS3(keyEleve, elevePath);
          urlEns = await putPdfS3(keyEns, ensPath);
          console.log('[generate_reports] Upload S3 réussi:', urlEleve, urlEns);
        } catch (ee) {
          console.warn('[generate_reports] Upload S3 ignoré:', ee?.message || ee);
        }
      } catch (e) {
        console.warn('[generate_reports] Génération React-PDF ignorée:', e?.message || e);
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
        console.log('[generate_reports] Email élève envoyé:', st.email);
      } catch (e) { console.warn('[generate_reports] Email élève ignoré:', e?.message || e); }
      try {
        await sendMail('alaeddine.benrhouma@ert.tn, pierre.caillabet@ert.tn', subject, body, []);
        console.log('[generate_reports] Email enseignants envoyé');
      } catch (e) { console.warn('[generate_reports] Email enseignants ignoré:', e?.message || e); }

      console.log('[generate_reports] Job complété:', attemptId, urlEleve, urlEns);
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
    const pg2 = new Client({ connectionString: process.env.DATABASE_URL }); await pg2.connect();
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
