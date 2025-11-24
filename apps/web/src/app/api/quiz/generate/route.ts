import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { studentId, purpose } = await req.json().catch(() => ({}));
  // Pick up to 5 exercises, or create an empty quiz if none
  const exos = await prisma.exercise.findMany({ take: 5, orderBy: { createdAt: 'asc' } });
  const quiz = await prisma.quiz.create({
    data: {
      studentId: studentId ?? null,
      createdById: 'teacher-demo',
      items: { create: exos.map((e, i) => ({ exerciseId: e.id, order: i * 10 })) },
    },
    include: { items: true },
  });
  return NextResponse.json({ ok: true, quiz });
}
