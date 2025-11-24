import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const quizId = String(params.id);
  const { studentId, items } = await req.json();
  const sub = await prisma.quizSubmission.create({
    data: {
      quizId,
      studentId: String(studentId || 'student-demo'),
      items: {
        create: (items || []).map((it: any) => ({ quizItemId: String(it.quizItemId), answerJson: it.answerJson ?? null })),
      },
    },
  });
  return NextResponse.json({ ok: true, submissionId: sub.id }, { status: 201 });
}