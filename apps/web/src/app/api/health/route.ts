export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

async function pingOpenAI(): Promise<boolean> {
  try {
    const key = process.env.OPENAI_API_KEY || '';
    if (!key) return false;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'Réponds STRICTEMENT en JSON.' },
          { role: 'user', content: 'Rends {"ok":true}' }
        ],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) return false;
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(txt);
    return parsed?.ok === true;
  } catch {
    return false;
  }
}

async function pingGemini(): Promise<boolean> {
  try {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) return false;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);
    const body = { contents: [{ role: 'user', parts: [{ text: 'Rends STRICTEMENT ce JSON: {"ok":true}' }] }], generationConfig: { responseMimeType: 'application/json' } };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return false;
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(txt);
    return parsed?.ok === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try { console.log('[WEB] REDIS_URL=', process.env.REDIS_URL || ''); } catch {}
  const result: Record<string, any> = { ok: true, checks: {} };
  const deep = (req.nextUrl.searchParams.get('deep') || '').toLowerCase() === '1';

  // DB check
  try {
    const pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
    const { rows } = await pg.query('SELECT 1 as ok');
    await pg.end();
    result.checks.db = rows?.[0]?.ok === 1;
  } catch (e: any) {
    result.ok = false;
    result.checks.db = false;
    result.checks.db_error = e?.message || String(e);
  }

  // Redis check (presence only)
  try {
    const url = process.env.REDIS_URL || '';
    result.checks.redis = Boolean(url);
  } catch (e: any) {
    result.ok = false;
    result.checks.redis = false;
  }

  // S3 check (presence only)
  try {
    result.checks.s3 = Boolean(process.env.S3_ENDPOINT);
  } catch {
    result.ok = false;
    result.checks.s3 = false;
  }

  // RAG check: at least one chunk
  try {
    const pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
    const { rows } = await pg.query('SELECT COUNT(*)::int as cnt FROM chunks');
    await pg.end();
    result.checks.rag_chunks = rows?.[0]?.cnt || 0;
    if ((rows?.[0]?.cnt || 0) <= 0) result.ok = false;
  } catch (e: any) {
    result.ok = false;
    result.checks.rag_chunks = 0;
    result.checks.rag_error = e?.message || String(e);
  }

  // LLM keys presence + deep ping
  try {
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    result.checks.llm_keys = hasOpenAI || hasGemini;
    if (!result.checks.llm_keys) result.ok = false;
    if (deep) {
      let ok = false;
      if (hasOpenAI) ok = await pingOpenAI();
      if (!ok && hasGemini) ok = await pingGemini();
      result.checks.llm_ping = ok;
      if (!ok) result.ok = false;
    }
  } catch {
    result.ok = false;
    result.checks.llm_keys = false;
  }

  const status = result.ok ? 200 : 503;
  return NextResponse.json(result, { status });
}
