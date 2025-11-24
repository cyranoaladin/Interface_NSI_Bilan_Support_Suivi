import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = String(params.id);
  const sub = await prisma.quizSubmission.findUnique({
    where: { id },
    include: {
      quiz: { select: { id: true } },
      items: { include: { quizItem: { include: { exercise: true } }, grading: true } },
    },
  });
  if (!sub) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const items = sub.items.map((it) => ({
    quizItemId: it.quizItemId,
    exerciseTitle: it.quizItem.exercise.title,
    type: it.quizItem.exercise.type,
    score: it.grading?.score ?? 0,
  }));
  const total = items.length ? items.reduce((a, b) => a + (b.score ?? 0), 0) / items.length : 0;
  return NextResponse.json({
    result: {
      submissionId: sub.id,
      student: { id: sub.studentId, name: sub.studentId },
      quizId: sub.quiz.id,
      totalScore: total,
      items,
    },
  });
}
