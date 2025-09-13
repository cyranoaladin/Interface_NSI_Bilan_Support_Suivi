import { loadPedagoSurvey, loadQcmData } from '@/lib/bilan_data';
import { env } from '@/lib/env';
import { scoreQCM } from '@/lib/scoring/nsi_qcm_scorer';
import { deriveProfileNSI, scorePedagoNSI } from '@/lib/scoring/pedago_nsi_indices';
import { getSessionEmail } from '@/lib/session';
import { semanticSearch } from '@/lib/vector';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const Schema = z.object({ qcmAnswers: z.record(z.any()).optional(), pedagoAnswers: z.record(z.any()).optional() });

export async function POST(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  const body = parsed.data;

  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  // Permissions: l'auteur du bilan ou l'élève concerné
  if (bilan.authorEmail !== email && (bilan.studentEmail ? bilan.studentEmail !== email : true)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  // Ne permettre qu'une seule soumission pour CE bilan
  if (bilan.status && bilan.status !== 'PENDING') {
    return NextResponse.json({ ok: false, error: 'Ce questionnaire a déjà été soumis.' }, { status: 409 });
  }

  const updates: any = {};
  if (body.qcmAnswers) {
    const qcm = loadQcmData();
    const res = scoreQCM(qcm, body.qcmAnswers);
    updates.qcmRawAnswers = body.qcmAnswers;
    updates.qcmScores = res;
  }
  if (body.pedagoAnswers) {
    const survey = loadPedagoSurvey();
    const ped = scorePedagoNSI(survey, body.pedagoAnswers);
    const prof = deriveProfileNSI(ped, body.pedagoAnswers);
    updates.pedagoRawAnswers = body.pedagoAnswers;
    updates.pedagoProfile = ped;
    updates.preAnalyzedData = prof;
    if (bilan.studentEmail) {
      await prisma.studentProfileData.upsert({
        where: { studentEmail: bilan.studentEmail },
        update: { pedagoRawAnswers: body.pedagoAnswers, pedagoProfile: ped, preAnalyzedData: prof, lastUpdatedAt: new Date() },
        create: { studentEmail: bilan.studentEmail, pedagoRawAnswers: body.pedagoAnswers, pedagoProfile: ped, preAnalyzedData: prof },
      });
    }
  }

  const saved = await prisma.bilan.update({ where: { id: bilan.id }, data: { ...updates, status: 'PROCESSING_AI_REPORT' } });

  // Déclenchements asynchrones: génération résumé élève + rapport enseignant
  ; (async () => {
    try {
      const systemStudent = 'Tu es un professeur de NSI. Tu rédiges un bilan court, positif et concret pour l\'élève (cap 2 semaines).';
      const systemTeacher = 'Tu es un professeur de NSI du Lycée Pierre Mendès France de Tunis. Tu rédiges une analyse diagnostique exploitable en classe.';
      const matiere = saved.matiere || 'NSI';
      const niveau = saved.niveau || 'Terminale';
      const lacunes = Array.isArray((saved as any)?.qcmScores?.critical_lacunes) ? (saved as any).qcmScores.critical_lacunes : [];
      const queries = (lacunes.length ? lacunes : ['python', 'structures', 'donnees']).map(d => `${matiere} ${niveau} ${d} programme objectifs prérequis`);
      let ragChunks: string[] = [];
      try { ragChunks = await semanticSearch(queries, 6); } catch { ragChunks = []; }

      const basePayload = {
        eleve: { prenom: '', nom: '', niveau, matiere },
        qcmScores: saved.qcmScores || {},
        qcmRawAnswers: (saved as any).qcmRawAnswers || {},
        pedagoProfile: saved.pedagoProfile || {},
        pedagoRawAnswers: (saved as any).pedagoRawAnswers || {},
        pre_analyzed_data: saved.preAnalyzedData || {},
        RAG_chunks: ragChunks,
      };

      async function callGemini(system: string, payload: any) {
        const key = env.GEMINI_API_KEY;
        if (!key) throw new Error('No GEMINI_API_KEY');
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);
        const body = { contents: [{ role: 'user', parts: [{ text: system }] }, { role: 'user', parts: [{ text: JSON.stringify(payload) }] }], generationConfig: { responseMimeType: 'application/json' } };
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error('Gemini status ' + r.status);
        const data = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        try { return JSON.parse(text); } catch { return { note: 'AI parse error', provider: 'gemini' }; }
      }

      async function callOpenAI(system: string, payload: any) {
        const key = env.OPENAI_API_KEY;
        if (!key) throw new Error('No OPENAI_API_KEY');
        const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }], response_format: { type: 'json_object' } }) });
        if (!r.ok) throw new Error('OpenAI status ' + r.status);
        const data = await r.json();
        const content = data?.choices?.[0]?.message?.content || '{}';
        try { return JSON.parse(content); } catch { return { note: 'AI parse error', provider: 'openai' }; }
      }

      async function generateWithFallback(system: string, payload: any) {
        let lastErr: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try { return await callGemini(system, payload); }
          catch (e1) {
            try { return await callOpenAI(system, payload); }
            catch (e2) { lastErr = e2; await new Promise(r => setTimeout(r, attempt * 700)); }
          }
        }
        throw lastErr || new Error('LLM generation failed');
      }

      const [studentJson, teacherJson] = await Promise.all([
        generateWithFallback(systemStudent, basePayload),
        generateWithFallback(systemTeacher, basePayload),
      ]);

      await prisma.bilan.update({ where: { id: saved.id }, data: { summaryText: JSON.stringify(studentJson), reportText: JSON.stringify(teacherJson), status: 'GENERATED' } });
    } catch {
      // En cas d'erreur, on laisse le statut en PROCESSING_AI_REPORT pour reprise manuelle
    }
  })();

  // 2) Créer Attempt + Scores et pousser un job BullMQ pour génération PDF par le worker
  try {
    const st = saved.studentEmail ? await prisma.student.findUnique({ where: { email: saved.studentEmail } }) : null;
    const attempt = await prisma.attempt.create({
      data: {
        studentEmail: saved.studentEmail || email,
        questionnaire: 'questionnaire_nsi_terminale_2025',
        submittedAt: new Date(),
        status: 'submitted',
        groupId: st?.groupId || null,
      }
    });
    const byDomain = (saved as any)?.qcmScores?.by_domain || {};
    const scoreCreates = Object.entries(byDomain).map(([domain, obj]: any) => ({
      domain: String(domain),
      pct: Number(obj?.percent || 0) / 100,
      raw: Number(obj?.points || 0),
      weight: Number(obj?.max || 0),
    }));
    if (scoreCreates.length > 0) {
      await prisma.$transaction(scoreCreates.map(s => prisma.score.create({ data: { attemptId: attempt.id, ...s } })));
    }
    const queue = new Queue('generate_reports', { connection: { url: env.REDIS_URL || process.env.REDIS_URL! } });
    await queue.add('generate_reports', { attemptId: attempt.id }, { removeOnComplete: true, removeOnFail: false });
  } catch (e) {
    // On n'échoue pas la requête si la mise en file échoue; logs côté serveur
    console.warn('[submit-answers] enqueue generate_reports failed:', (e as any)?.message || e);
  }

  return NextResponse.json({ ok: true, bilan: saved });
}
