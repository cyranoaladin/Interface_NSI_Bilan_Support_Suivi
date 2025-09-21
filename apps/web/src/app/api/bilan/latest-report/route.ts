export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeParam = (searchParams.get('type') || '').toLowerCase(); // optional: 'eleve' | 'enseignant'

  try {
    if (session.role === 'STUDENT') {
      // Trouver la dernière tentative de l'élève qui a au moins un report (optionnellement filtré par type)
      const attempt = await prisma.attempt.findFirst({
        where: {
          studentEmail: session.email,
          reports: typeParam ? { some: { type: typeParam } } : { some: {} },
        },
        orderBy: { submittedAt: 'desc' },
      });
      if (!attempt) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      const reports = await prisma.report.findMany({
        where: { attemptId: attempt.id, ...(typeParam ? { type: typeParam } : {}) },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, type: true, pdfUrl: true, publishedAt: true },
      });
      if (reports.length === 0) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      return NextResponse.json({
        ok: true,
        attempt: { id: attempt.id, submittedAt: attempt.submittedAt, status: attempt.status },
        reports,
      });
    }

    if (session.role === 'TEACHER') {
      // Requiert studentEmail param
      const studentEmail = (searchParams.get('studentEmail') || '').toLowerCase();
      if (!studentEmail) return NextResponse.json({ ok: false, error: 'Missing studentEmail' }, { status: 400 });
      const student = await prisma.student.findUnique({ where: { email: studentEmail } });
      if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
      // Vérifier que l'enseignant a le droit (lien teacherOnGroup)
      const can = await prisma.teacherOnGroup.findUnique({
        where: { teacherEmail_groupId: { teacherEmail: session.email, groupId: student.groupId } },
      });
      if (!can) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

      const attempt = await prisma.attempt.findFirst({
        where: { studentEmail, reports: typeParam ? { some: { type: typeParam } } : { some: {} } },
        orderBy: { submittedAt: 'desc' },
      });
      if (!attempt) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      const reports = await prisma.report.findMany({
        where: { attemptId: attempt.id, ...(typeParam ? { type: typeParam } : {}) },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, type: true, pdfUrl: true, publishedAt: true },
      });
      if (reports.length === 0) return NextResponse.json({ ok: false, error: 'No report yet' }, { status: 404 });

      return NextResponse.json({
        ok: true,
        attempt: { id: attempt.id, submittedAt: attempt.submittedAt, status: attempt.status },
        reports,
      });
    }

    return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
