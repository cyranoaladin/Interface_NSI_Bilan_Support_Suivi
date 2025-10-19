import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.email || session.role !== 'TEACHER') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const evaluationId = Number(searchParams.get('evaluationId') || '0') || undefined;
  const studentEmail = searchParams.get('studentEmail') || undefined;

  try {
    if (evaluationId && studentEmail) {
      // Recherche ciblée, avec variante -e/normal
      let bilan = await (prisma as any).evaluationBilan.findUnique({ where: { studentEmail_evaluationId: { studentEmail, evaluationId } } });
      if (!bilan) {
        const lower = String(studentEmail).toLowerCase();
        const m = lower.match(/^(.+?)(-e)?(@ert\.tn)$/i);
        if (m) {
          const base = m[1];
          const hasE = !!m[2];
          const domain = m[3];
          const alt = hasE ? `${base}${domain}` : `${base}-e${domain}`;
          bilan = await (prisma as any).evaluationBilan.findUnique({ where: { studentEmail_evaluationId: { studentEmail: alt, evaluationId } } });
        }
      }
      return NextResponse.json({ ok: true, bilan });
    }
    if (evaluationId) {
      const [evaluation, bilans] = await Promise.all([
        (prisma as any).evaluation.findUnique({ where: { id: evaluationId }, select: { id: true, title: true, date: true } }),
        (prisma as any).evaluationBilan.findMany({ where: { evaluationId } }),
      ]);
      return NextResponse.json({ ok: true, evaluation, bilans });
    }
    const evaluations = await (prisma as any).evaluation.findMany({ orderBy: { date: 'desc' }, select: { id: true, title: true, date: true } });
    return NextResponse.json({ ok: true, evaluations });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

// (supprimé: ancien handler doublon basé sur attempts/reports)
