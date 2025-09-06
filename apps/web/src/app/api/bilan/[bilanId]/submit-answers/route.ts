import { loadPedagoSurvey, loadQcmData } from '@/lib/bilan_data';
import { scoreQCM } from '@/lib/scoring/nsi_qcm_scorer';
import { deriveProfileNSI, scorePedagoNSI } from '@/lib/scoring/pedago_nsi_indices';
import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();
const Schema = z.object({ qcmAnswers: z.record(z.any()).optional(), pedagoAnswers: z.record(z.any()).optional() });

export async function POST(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = Schema.parse(await req.json());

  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (bilan.userId !== user.id && bilan.studentId) {
    const st = await prisma.student.findUnique({ where: { id: bilan.studentId } });
    if (!st || st.email !== email) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
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
    if (bilan.studentId) {
      await prisma.studentProfileData.upsert({
        where: { studentId: bilan.studentId },
        update: { pedagoRawAnswers: body.pedagoAnswers, pedagoProfile: ped, preAnalyzedData: prof, lastUpdatedAt: new Date() },
        create: { studentId: bilan.studentId, pedagoRawAnswers: body.pedagoAnswers, pedagoProfile: ped, preAnalyzedData: prof },
      });
    }
  }

  const saved = await prisma.bilan.update({ where: { id: bilan.id }, data: { ...updates, status: 'PROCESSING_AI_REPORT' } });
  return NextResponse.json({ ok: true, bilan: saved });
}
