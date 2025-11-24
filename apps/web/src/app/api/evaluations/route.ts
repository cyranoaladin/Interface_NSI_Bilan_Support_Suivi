import { getSessionEmail } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const evaluations = await (prisma as any).evaluation.findMany({
      orderBy: { date: 'desc' },
      select: { id: true, title: true, date: true },
    });
    return NextResponse.json({ ok: true, evaluations });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
