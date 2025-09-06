import { env } from '@/lib/env';
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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { bilanId } = Schema.parse(await req.json());
  const bilan = await prisma.bilan.findUnique({ where: { id: bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (bilan.userId !== user.id && bilan.studentId) {
    const st = await prisma.student.findUnique({ where: { id: bilan.studentId } });
    if (!st || st.email !== email) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const system = 'Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges une analyse diagnostique exploitable en classe.';

  // --- Mini-retrieval RAG
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

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o', temperature: 0.2,
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }],
      response_format: { type: 'json_object' }
    })
  });
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  const parsed = safeParseJSON(content);

  const updated = await prisma.bilan.update({ where: { id: bilan.id }, data: { reportText: JSON.stringify(parsed), status: 'GENERATED' } });
  return NextResponse.json({ ok: true, reportText: updated.reportText });
}

function safeParseJSON(s: string) { try { return JSON.parse(s); } catch { return {}; } }
