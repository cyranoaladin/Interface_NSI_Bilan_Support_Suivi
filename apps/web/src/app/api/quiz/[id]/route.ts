import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = String(params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { items: { include: { exercise: true }, orderBy: { order: 'asc' } } },
  });
  if (!quiz) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ quiz });
}
