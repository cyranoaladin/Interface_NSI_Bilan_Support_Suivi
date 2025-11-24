export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth-utils';
import { metrics } from '@/lib/metrics';

const prisma = new PrismaClient();

export async function GET() {
  const startTime = Date.now();
  const session = await getSession();

  if (!session?.email) {
    const duration = (Date.now() - startTime) / 1000;
    metrics.observeHttpRequestDuration('GET', '/api/me', 401, duration);
    metrics.incrementHttpRequestTotal('GET', '/api/me', 401);
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Teacher ou Student
    const teacherStart = Date.now();
    const teacher = await prisma.teacher.findUnique({ where: { email: session.email } });
    const teacherQueryTime = (Date.now() - teacherStart) / 1000;
    metrics.observeDbQueryDuration('findUnique', 'Teacher', teacherQueryTime);

    if (teacher) {
      const duration = (Date.now() - startTime) / 1000;
      metrics.observeHttpRequestDuration('GET', '/api/me', 200, duration);
      metrics.incrementHttpRequestTotal('GET', '/api/me', 200);
      return NextResponse.json({ ok: true, role: 'TEACHER', email: teacher.email, firstName: teacher.firstName, lastName: teacher.lastName });
    }

    const studentStart = Date.now();
    const student = await prisma.student.findUnique({ where: { email: session.email } });
    const studentQueryTime = (Date.now() - studentStart) / 1000;
    metrics.observeDbQueryDuration('findUnique', 'Student', studentQueryTime);

    if (student) {
      const duration = (Date.now() - startTime) / 1000;
      metrics.observeHttpRequestDuration('GET', '/api/me', 200, duration);
      metrics.incrementHttpRequestTotal('GET', '/api/me', 200);
      return NextResponse.json({
        ok: true,
        role: 'STUDENT',
        email: student.email,
        givenName: student.givenName,
        familyName: student.familyName,
        classe: student.classe
      });
    }

    const duration = (Date.now() - startTime) / 1000;
    metrics.observeHttpRequestDuration('GET', '/api/me', 404, duration);
    metrics.incrementHttpRequestTotal('GET', '/api/me', 404);
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  } catch (e: any) {
    const duration = (Date.now() - startTime) / 1000;
    metrics.observeHttpRequestDuration('GET', '/api/me', 500, duration);
    metrics.incrementHttpRequestTotal('GET', '/api/me', 500);
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
