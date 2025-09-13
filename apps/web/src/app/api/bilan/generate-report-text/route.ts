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

  const system = 'Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges une analyse diagnostique EXPLOITABLE en classe et orientée action. Intègre les faiblesses issues des scores et les extraits RAG (références programme) pour proposer des gestes professionnels précis, un plan de 4 semaines détaillé (séances, objectifs, exercices, ressources RAG), et des indicateurs de suivi. Structure JSON stricte: synthese_profil, diagnostic_pedagogique (par domaine), plan_4_semaines (hebdo), indicateurs_pedago, rag_references.';

  // --- Mini-retrieval RAG
  const lacunes: string[] = Array.isArray((bilan as any)?.qcmScores?.critical_lacunes) ? (bilan as any).qcmScores.critical_lacunes : [];
  const matiere = bilan.matiere || 'NSI';
  const niveau = bilan.niveau || 'Terminale';
  const queries = (lacunes.length ? lacunes : ['python', 'structures', 'donnees'])
    .map(d => `${matiere} ${niveau} ${d} programme objectifs prérequis`);
  let ragChunks: string[] = [];
  try { ragChunks = await semanticSearch(queries, 6); } catch { ragChunks = []; }
  if (req.headers.get('x-rag-mock')) {
    ragChunks = ['MOCK RAG CHUNK'];
  }

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
    const resp = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o', temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }], response_format: { type: 'json_object' } }) });
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
    try {
      const updated = await prisma.bilan.update({ where: { id: bilan.id }, data: { reportText: JSON.stringify({ mocked: true }), status: 'GENERATED' } });
      return NextResponse.json({ ok: true, reportText: updated.reportText, payload });
    } catch {
      // En mode test, si l'id n'existe pas, renvoyer tout de même le payload mocké
      return NextResponse.json({ ok: true, reportText: JSON.stringify({ mocked: true }), payload });
    }
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

  const updated = await prisma.bilan.update({ where: { id: bilan.id }, data: { reportText: JSON.stringify(parsed), status: 'GENERATED' } });
  return NextResponse.json({ ok: true, reportText: updated.reportText });
}

function safeParseJSON(s: string) { try { return JSON.parse(s); } catch { return {}; } }
