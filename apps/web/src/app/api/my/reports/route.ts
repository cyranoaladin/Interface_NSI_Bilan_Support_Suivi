export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);

    if (session.role === 'STUDENT') {
      // Dernières tentatives de l'élève connecté
      const attempts = await prisma.attempt.findMany({
        where: { studentEmail: session.email },
        select: { id: true, submittedAt: true, status: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      });
      const hasSubmitted = attempts.some(a => !!a.submittedAt || (a.status && a.status !== 'in_progress'));
      if (attempts.length === 0) return NextResponse.json({ ok: true, reports: [], hasSubmitted: false });
      const attemptIds = attempts.map((a) => a.id);
      const reports = await prisma.report.findMany({
        where: { attemptId: { in: attemptIds } },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 20,
        select: { id: true, type: true, publishedAt: true, pdfUrl: true, attemptId: true },
      });
      return NextResponse.json({ ok: true, reports, hasSubmitted });
    }

    if (session.role === 'TEACHER') {
      // Exiger studentEmail pour les enseignants
      const studentEmail = (searchParams.get('studentEmail') || '').toLowerCase();
      if (!studentEmail) return NextResponse.json({ ok: false, error: 'Missing studentEmail' }, { status: 400 });

      const student = await prisma.student.findUnique({ where: { email: studentEmail } });
      if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });

      // Vérifier l'appartenance du prof au groupe de l'élève
      const can = await prisma.teacherOnGroup.findUnique({
        where: { teacherEmail_groupId: { teacherEmail: session.email, groupId: student.groupId } },
      });
      if (!can) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

      const attempts = await prisma.attempt.findMany({
        where: { studentEmail },
        select: { id: true },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      });
      if (attempts.length === 0) return NextResponse.json({ ok: true, reports: [] });
      const attemptIds = attempts.map((a) => a.id);
      const reports = await prisma.report.findMany({
        where: { attemptId: { in: attemptIds } },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 20,
        select: { id: true, type: true, publishedAt: true, pdfUrl: true, attemptId: true },
      });
      return NextResponse.json({ ok: true, reports });
    }

    return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
