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

  // In a real check, ensure teacher has rights on this student via group relation
  const bilans = await prisma.report.findMany({
    where: { attempt: { student: { email: studentEmail } } },
    select: { id: true, type: true, pdfUrl: true, publishedAt: true }
  });
  return NextResponse.json({ ok: true, bilans });
}
