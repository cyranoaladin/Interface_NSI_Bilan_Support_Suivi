import { getSessionEmail } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { bilanId: string; }; }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const bilan = await prisma.bilan.findUnique({ where: { id: params.bilanId } });
  if (!bilan) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (bilan.userId !== user.id && bilan.studentId) {
    const st = await prisma.student.findUnique({ where: { id: bilan.studentId } });
    if (!st || st.email !== email) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, bilan });
}
