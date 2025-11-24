import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { submissionId } = await req.json();
  // Minimal grading: set score 1.0 for all items
  const sub = await prisma.quizSubmission.findUnique({ where: { id: String(submissionId) }, include: { items: true } });
  if (!sub) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  for (const it of sub.items) {
    await prisma.submissionItem.update({ where: { id: it.id }, data: { answerJson: it.answerJson } });
    await prisma.submissionItemGrading.upsert({
      where: { submissionItemId: it.id },
      update: { score: 1.0 },
      create: { submissionItemId: it.id, score: 1.0 },
    });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}