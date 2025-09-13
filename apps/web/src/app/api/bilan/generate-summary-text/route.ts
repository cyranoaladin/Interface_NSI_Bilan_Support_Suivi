export const dynamic = 'force-dynamic';
import { env } from '@/lib/env';
import { metrics } from '@/lib/metrics';
import { setLastLlmPayload } from '@/lib/mock';
import { getSessionEmail } from '@/lib/session';
import { semanticSearch } from '@/lib/vector';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const Schema = z.object({ bilanId: z.string() });

export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { bilanId } = Schema.parse(await req.json());
  const bilan = await prisma.bilan.findUnique({ where: { id: bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (bilan.authorEmail !== email && (bilan.studentEmail ? bilan.studentEmail !== email : true)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const system = 'Tu es un professeur de NSI. Tu rédiges un bilan riche, précis, contextualisé et actionnable pour l\'élève (horizon 2 semaines). Intègre EXPRESSEMENT les faibles domaines identifiés dans les scores et exploite les extraits RAG pour proposer des stratégies concrètes et des ressources ciblées. Structure attendue (JSON strict): introduction, analyse_competences (détaillée par domaine), profil_apprentissage, plan_action (étapes hebdomadaires, ressources RAG), conclusion, rag_references.';

  // Mini-retrieval RAG
  const lacunes: string[] = Array.isArray((bilan as any)?.qcmScores?.critical_lacunes) ? (bilan as any).qcmScores.critical_lacunes : [];
  const matiere = bilan.matiere || 'NSI';
  const niveau = bilan.niveau || 'Terminale';
  const queries = (lacunes.length ? lacunes : ['python', 'structures', 'donnees'])
    .map(d => `${matiere} ${niveau} ${d} programme objectifs prérequis`);
  let ragChunks: string[] = [];
  try { ragChunks = await semanticSearch(queries, 6); } catch { ragChunks = []; }

  const payload = {
    eleve: {
      prenom: '', nom: '', niveau: bilan.niveau || 'Terminale', matiere: bilan.matiere || 'NSI'
    },
    qcmScores: bilan.qcmScores || {},
    qcmRawAnswers: (bilan as any).qcmRawAnswers || {},
    pedagoProfile: bilan.pedagoProfile || {},
    pedagoRawAnswers: (bilan as any).pedagoRawAnswers || {},
    pre_analyzed_data: bilan.preAnalyzedData || {},
    RAG_chunks: ragChunks
  };

  async function callGemini(system: string, payload: any) {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error('No GEMINI_API_KEY');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);
    const body = { contents: [{ role: 'user', parts: [{ text: system }] }, { role: 'user', parts: [{ text: JSON.stringify(payload) }] }], generationConfig: { responseMimeType: 'application/json' } };
    const t0 = Date.now();
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const dt = (Date.now() - t0) / 1000;
    metrics.observeLlmLatency('gemini', dt);
    if (!r.ok) throw new Error('Gemini status ' + r.status);
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return safeParseJSON(text);
  }

  async function callOpenAI(system: string, payload: any) {
    const key = env.OPENAI_API_KEY;
    if (!key) throw new Error('No OPENAI_API_KEY');
    const t0 = Date.now();
    const resp = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }], response_format: { type: 'json_object' } }) });
    const dt = (Date.now() - t0) / 1000;
    metrics.observeLlmLatency('openai', dt);
    if (!resp.ok) throw new Error('OpenAI status ' + resp.status);
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    return safeParseJSON(content);
  }

  // Mode test E2E: si header x-llm-mock présent, capturer payload et court-circuiter
  const mockHeader = req.headers.get('x-llm-mock');
  if (mockHeader) {
    try { setLastLlmPayload(payload); } catch {}
    const updated = await prisma.bilan.update({ where: { id: bilan.id }, data: { summaryText: JSON.stringify({ mocked: true }), status: 'GENERATED' } });
    return NextResponse.json({ ok: true, summaryText: updated.summaryText });
  }

  // Réessais avec priorité Gemini puis OpenAI
  let parsed: any = {};
  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      try { parsed = await callGemini(system, payload); }
      catch { parsed = await callOpenAI(system, payload); }
      break;
    } catch (e) {
      lastErr = e;
      if (attempt === 3) return NextResponse.json({ ok: false, error: 'LLM generation failed' }, { status: 502 });
      await new Promise(r => setTimeout(r, attempt * 600));
    }
  }

  const updated = await prisma.bilan.update({ where: { id: bilan.id }, data: { summaryText: JSON.stringify(parsed), status: 'GENERATED' } });
  return NextResponse.json({ ok: true, summaryText: updated.summaryText });
}

function safeParseJSON(s: string) { try { return JSON.parse(s); } catch { return {}; } }
