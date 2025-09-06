import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import pdf from "pdf-parse";
import { Client } from "pg";

async function embedBatch(texts: string[]) {
  const provider = process.env.EMBEDDING_PROVIDER || 'gemini';
  if (provider === 'gemini') {
    const model = process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004';
    const key = process.env.GEMINI_API_KEY || '';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(key)}`;
    const body = { inputs: texts.map(t => ({ content: { parts: [{ text: t }] } })) };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.text().catch(() => '');
      throw new Error('Gemini error ' + res.status + ': ' + b);
    }
    const data = await res.json() as any;
    const vectors: number[][] = (data.embeddings || data.batchEmbeddings || data?.results || []).map((e: any) => (e.values || e.embedding || e)?.values || e);
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
  const dir = "/app/rag_pdfs";
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))
    : [];

  if (files.length === 0) {
    console.warn("Aucun PDF trouvé dans " + dir + " — rien à ingérer.");
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  try {
    for (const f of files) {
      const filePath = path.join(dir, f);
      const title = path.basename(f, path.extname(f));
      try {
        const result = await pg.query(
          "INSERT INTO documents(source, path, title) VALUES('local', $1, $2) RETURNING id",
          [filePath, title]
        );
        const id = result.rows[0].id;

        const dataBuffer = fs.readFileSync(filePath);
        const text = (await pdf(dataBuffer)).text;

        const chunks = text.match(/(?:.|\n){1,4000}/g) || [];
        for (let i = 0; i < chunks.length; i += 16) {
          const batch = chunks.slice(i, i + 16);
          const emb = await embedBatch(batch);
          for (let j = 0; j < batch.length; j++) {
            await pg.query(
              "INSERT INTO chunks(document_id, text, embedding) VALUES($1, $2, $3)",
              [id, batch[j], emb[j]]
            );
          }
        }

        console.log(`Ingestion OK: ${f} — ${chunks.length} chunks`);
      } catch (e: any) {
        console.error(`Skip ${f}:`, e?.message ?? e);
      }
    }
  } finally {
    await pg.end();
  }

  console.log("Terminé.");
})();
