// @ts-nocheck
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import pdf from "pdf-parse";
import { Client } from "pg";

async function embedBatch(texts: string[]) {
  const provider = process.env.EMBEDDING_PROVIDER || 'gemini';
  if (provider === 'mock') {
    const target = Number(process.env.VECTOR_DIM || 768);
    return texts.map(() => Array(target).fill(0));
  }
  if (provider === 'gemini') {
    const model = process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004';
    const key = process.env.GEMINI_API_KEY || '';
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    const url = `https://generativelanguage.googleapis.com/v1/${modelPath}:batchEmbedContents?key=${encodeURIComponent(key)}`;
    const body = {
      requests: texts.map(t => ({
        model: modelPath,
        content: { parts: [{ text: t }] },
        taskType: 'RETRIEVAL_DOCUMENT'
      }))
    } as any;
    const bodyStr = JSON.stringify(body);
    console.log('Gemini batchEmbedContents URL:', url);
    console.log('Gemini batchEmbedContents BODY:', bodyStr.slice(0, 200));
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr });
    if (!res.ok) {
      const b = await res.text().catch(() => '');
      throw new Error('Gemini error ' + res.status + ': ' + b);
    }
    const data = await res.json() as any;
    const vectors: number[][] = (data.embeddings || []).map((e: any) => (e.values || e.embedding?.values || e));
    return vectors.map(v => {
      const n = Math.hypot(...v);
      let out = v.map(x => x / (n || 1));
      const target = Number(process.env.VECTOR_DIM || 768);
      if (out.length < target) out = out.concat(Array(target - out.length).fill(0));
      if (out.length > target) out = out.slice(0, target);
      return out;
    });
  }
  const url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";
  const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + (process.env.HF_TOKEN || ''), 'Content-Type': 'application/json' }, body: JSON.stringify(texts) });
  if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error('HF error ' + res.status + ': ' + body); }
  const arr = (await res.json()) as number[][];
  return arr.map(v => { const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); const target = Number(process.env.VECTOR_DIM || 384); if (out.length < target) out = out.concat(Array(target - out.length).fill(0)); if (out.length > target) out = out.slice(0, target); return out; });
}

(async () => {
  // Lire la configuration questionnaire pour récupérer reporting.rag
  const qPaths = [
    path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json'),
    '/app/data/questionnaire_nsi_terminale.final.json'
  ];
  let config: any = {};
  for (const p of qPaths) { if (fs.existsSync(p)) { config = JSON.parse(fs.readFileSync(p, 'utf8')); break; } }
  const ragCfg = (config.reporting && config.reporting.rag) || {};
  const primary = ragCfg.primary_guide as { path: string; label?: string; };
  const contextual = Array.isArray(ragCfg.contextual_sources) ? ragCfg.contextual_sources as Array<{ path: string; label?: string; }> : [];

  const sources: Array<{ path: string; label: string; }> = [];
  if (primary?.path) sources.push({ path: primary.path, label: primary.label || 'Guide Pédagogique NSI PMF' });
  for (const s of contextual) { if (s?.path) sources.push({ path: s.path, label: s.label || path.basename(s.path) }); }

  if (sources.length === 0) {
    console.warn('Aucune source RAG trouvée dans reporting.rag');
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Ensure schema compatibility: add label column if missing
  async function ensureLabelColumn() {
    const res = await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name='documents' AND column_name='label'");
    if (res.rowCount === 0) {
      console.log('Schema update: adding documents.label column...');
      await pg.query('ALTER TABLE documents ADD COLUMN label TEXT');
      console.log('Schema update: documents.label added.');
    }
  }

  await ensureLabelColumn();

  async function insertDocument(filePath: string, label: string) {
    const lower = filePath.toLowerCase();
    let text = '';
    if (lower.endsWith('.pdf')) {
      console.log(`Processing PDF: ${filePath}`);
      const buf = fs.readFileSync(filePath);
      console.log('Parsing PDF (extract text)...');
      text = (await pdf(buf)).text || '';
    } else if (lower.endsWith('.md') || lower.endsWith('.mdx') || lower.endsWith('.txt')) {
      console.log(`Processing text/markdown: ${filePath}`);
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      console.warn('Type non supporté, skip:', filePath);
      return;
    }
    await pg.query('BEGIN');
    try {
      // Supprimer une éventuelle ancienne version de ce document (idempotence)
      await pg.query("DELETE FROM documents WHERE path = $1", [filePath]);
      console.log('Inserting document row...');
      const ins = await pg.query("INSERT INTO documents(source, path, title, label) VALUES('local', $1, $2, $3) RETURNING id", [filePath, path.basename(filePath), label]);
      const id = ins.rows[0].id;
      console.log('Chunking text...');
      const chunks = (text.match(/(?:.|\n){1,1200}/g) || []).filter(c => c.trim().length > 0);
      console.log(`Chunking done: ${chunks.length} chunks.`);
      for (let i = 0; i < chunks.length; i += 16) {
        const batch = chunks.slice(i, i + 16);
        console.log(`Embedding batch ${i}-${i + batch.length - 1}...`);
        const emb = await embedBatch(batch);
        for (let j = 0; j < batch.length; j++) {
          const vec = Array.isArray(emb[j]) ? emb[j] : [];
          const nums = vec.map((x: any) => Number(x));
          const lit = '[' + nums.join(',') + ']';
          // Debug court
          if (i === 0 && j === 0) {
            console.log('Vector sample for insert:', lit.slice(0, 120));
          }
          await pg.query("INSERT INTO chunks(document_id, text, embedding) VALUES($1, $2, $3::vector)", [id, batch[j], lit]);
        }
      }
      await pg.query('COMMIT');
      console.log(`Done: ${label} (${filePath}) — ${chunks.length} chunks`);
    } catch (e) {
      await pg.query('ROLLBACK');
      console.error('Erreur ingestion (rollback):', (e as any)?.message || e);
      throw e;
    }
  }

  try {
    for (const s of sources) {
      if (!fs.existsSync(s.path)) { console.warn('Fichier introuvable, skip:', s.path); continue; }
      try { await insertDocument(s.path, s.label); } catch (e: any) { console.error('Erreur ingestion', s.path, e?.message || e); }
    }
  } finally {
    await pg.end();
  }
  console.log('Terminé.');
})();
