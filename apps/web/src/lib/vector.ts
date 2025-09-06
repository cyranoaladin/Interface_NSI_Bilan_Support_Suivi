import fetch from 'node-fetch';
import { Client } from 'pg';
import { env } from './env';

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (env.EMBEDDING_PROVIDER === 'gemini') {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(env.GEMINI_EMBEDDINGS_MODEL) + ':embedContent?key=' + encodeURIComponent(env.GEMINI_API_KEY || '');
    const body = { inputs: texts.map(t => ({ content: { parts: [{ text: t }] } })) };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Gemini error ' + res.status);
    const data = await res.json();
    const vectors: number[][] = (data.embeddings || data.batchEmbeddings || data?.results || []).map((e: any) => (e.values || e.embedding || e)?.values || e);
    return vectors.map(v => {
      // normalize & pad/trim to VECTOR_DIM
      const n = Math.hypot(...v);
      let out = v.map((x: number) => x / (n || 1));
      const target = env.VECTOR_DIM;
      if (out.length < target) out = out.concat(Array(target - out.length).fill(0));
      if (out.length > target) out = out.slice(0, target);
      return out;
    });
  }
  // Fallback HF
  const url = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${env.HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(texts) });
  if (!res.ok) throw new Error(`HF error ${res.status}`);
  const arr = (await res.json()) as number[][];
  return arr.map(v => {
    const n = Math.hypot(...v); let out = v.map(x => x / (n || 1)); if (out.length !== env.VECTOR_DIM) {
      if (out.length < env.VECTOR_DIM) out = out.concat(Array(env.VECTOR_DIM - out.length).fill(0)); else out = out.slice(0, env.VECTOR_DIM);
    } return out;
  });
}

function toVectorLiteral(vec: number[]): string {
  return '[' + vec.map(x => Number(x).toFixed(6)).join(',') + ']';
}

export async function semanticSearch(queries: string[], topK = 6): Promise<string[]> {
  const pg = new Client({ connectionString: env.DATABASE_URL });
  await pg.connect();
  try {
    const results: string[] = [];
    for (const q of queries) {
      const [vec] = await embedBatch([q]);
      const lit = toVectorLiteral(vec);
      const { rows } = await pg.query(
        `SELECT text FROM chunks ORDER BY embedding <=> $1::vector LIMIT $2`,
        [lit, topK]
      );
      for (const r of rows) results.push(r.text);
    }
    // Dedupe and cap ~12
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of results) {
      if (!seen.has(t)) { seen.add(t); out.push(t); }
      if (out.length >= 12) break;
    }
    return out;
  } finally {
    await pg.end().catch(() => {});
  }
}
