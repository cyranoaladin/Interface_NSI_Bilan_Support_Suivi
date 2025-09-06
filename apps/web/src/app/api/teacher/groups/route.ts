import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const links = await prisma.teacherOnGroup.findMany({ where: { teacherEmail: email }, include: { group: true } });
  const groups = links.map(l => ({ id: l.group.id, name: l.group.name, code: l.group.code, academicYear: l.group.academicYear }));
  return NextResponse.json({ ok: true, groups });
}
