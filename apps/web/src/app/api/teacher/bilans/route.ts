import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const teacherEmail = await getSessionEmail();
  if (!teacherEmail) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentEmail = searchParams.get('studentEmail');
  if (!studentEmail) return NextResponse.json({ ok: false, error: 'Missing studentEmail' }, { status: 400 });

  // Étape 1: récupérer les attempts de l'élève
  const attempts = await prisma.attempt.findMany({ where: { studentEmail }, select: { id: true }, orderBy: { submittedAt: 'desc' } });
  if (attempts.length === 0) return NextResponse.json({ ok: true, bilans: [] });
  const attemptIds = attempts.map(a => a.id);

  // Étape 2: récupérer les rapports publiés associés à ces attempts (PDF disponibles)
  const bilans = await prisma.report.findMany({
    where: { attemptId: { in: attemptIds }, pdfUrl: { not: null } },
    select: { id: true, type: true, pdfUrl: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' }
  });
  return NextResponse.json({ ok: true, bilans });
}
