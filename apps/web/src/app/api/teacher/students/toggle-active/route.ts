import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.email || session.role !== 'TEACHER') return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { email, enable } = await req.json().catch(() => ({} as any));
  if (!email || typeof enable !== 'boolean') return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  const st = await prisma.student.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!st) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  await prisma.student.update({ where: { email: st.email }, data: { active: enable } });
  return NextResponse.json({ ok: true });
}
