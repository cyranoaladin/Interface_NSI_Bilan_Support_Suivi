import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const teacherEmail = await getSessionEmail();
  if (!teacherEmail) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 });

  // ensure teacher belongs to group
  const can = await prisma.teacherOnGroup.findUnique({ where: { teacherEmail_groupId: { teacherEmail, groupId } } });
  if (!can) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const students = await prisma.student.findMany({ where: { groupId }, select: { email: true, givenName: true, familyName: true } });
  return NextResponse.json({ ok: true, students: students.map(s => ({ email: s.email, name: `${s.familyName} ${s.givenName}` })) });
}
