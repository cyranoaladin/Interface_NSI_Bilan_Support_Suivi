import { getSession } from '@/lib/auth-utils';
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
      const bilan = await (prisma as any).evaluationBilan.findFirst({
        where: { evaluationId, studentEmail }
      });
      return NextResponse.json({ ok: true, bilan });
    }

    if (studentEmail) {
      // Récupérer les bilans d'entrée (table Bilan)
      const entryBilans = await prisma.bilan.findMany({
        where: {
          OR: [
            { studentEmail },
            { authorEmail: session.email }
          ]
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          matiere: true,
          niveau: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          studentEmail: true,
          authorEmail: true,
        }
      });

      // Récupérer les bilans d'évaluation (table EvaluationBilan)
      const evalBilans = await (prisma as any).evaluationBilan.findMany({
        where: { studentEmail },
        include: { evaluation: { select: { id: true, title: true, date: true } } }
      });

      // Formater les bilans d'entrée pour l'affichage
      const bilans = [
        ...entryBilans.map(b => ({
          id: b.id,
          type: 'bilan_entree',
          title: `Bilan d'entrée ${b.matiere} - ${b.niveau}`,
          status: b.status,
          createdAt: b.createdAt,
          pdfUrl: b.status === 'GENERATED' ? `/api/bilan/pdf/${b.id}` : null,
          publishedAt: b.updatedAt,
        })),
        ...evalBilans.map((eb: any) => ({
          id: eb.id,
          type: 'evaluation',
          title: eb.evaluation?.title || 'Évaluation',
          noteFinale: eb.noteFinale,
          createdAt: eb.evaluation?.date,
          pdfUrl: null,
          publishedAt: null,
        }))
      ];

      return NextResponse.json({ ok: true, bilans });
    }
    if (evaluationId) {
      const bilans = await (prisma as any).evaluationBilan.findMany({ where: { evaluationId } });
      return NextResponse.json({ ok: true, bilans });
    }
    const evaluations = await (prisma as any).evaluation.findMany({ orderBy: { date: 'desc' }, select: { id: true, title: true, date: true } });
    return NextResponse.json({ ok: true, evaluations });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}

// (supprimé: ancien handler doublon basé sur attempts/reports)
