export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getSession();
  if (!session?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // Teacher ou Student
    const teacher = await prisma.teacher.findUnique({ where: { email: session.email } });
    if (teacher) {
      return NextResponse.json({ ok: true, role: 'TEACHER', email: teacher.email, firstName: teacher.firstName, lastName: teacher.lastName });
    }
    const student = await prisma.student.findUnique({ where: { email: session.email } });
    if (student) {
      return NextResponse.json({ ok: true, role: 'STUDENT', email: student.email, givenName: student.givenName, familyName: student.familyName, classe: student.classe });
    }
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
