import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, err } from "@/lib/http";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { exercise: { select: { id: true, type: true, title: true, statementMd: true, difficulty: true } } },
        },
      },
    });
    if (!quiz) return err("not_found", undefined, { status: 404 });
    return ok({ quiz });
  } catch (e: any) {
    return err("quiz_load_failed", e?.message);
  }
}

const SubmitBody = z.object({
  items: z.array(z.object({
    quizItemId: z.string().min(1),
    answerJson: z.any().optional(),
    codePy: z.string().max(200_000).optional(),
  })).min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.sub) return err("unauthorized", undefined, { status: 401 });

    const { items } = SubmitBody.parse(await req.json());

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id }, select:{ id:true }});
    if (!quiz) return err("not_found", undefined, { status: 404 });

    const submission = await prisma.quizSubmission.create({
      data: { quizId: quiz.id, studentId: session.sub },
    });

    await prisma.submissionItem.createMany({
      data: items.map(i => ({
        submissionId: submission.id,
        quizItemId: i.quizItemId,
        answerJson: i.answerJson ?? null,
        codePy: i.codePy ?? null,
      })),
    });

    // TODO: enqueue grading (BullMQ) — queue "grade-submission"
    return ok({ submissionId: submission.id });
  } catch (e: any) {
    return err("submit_failed", e?.message);
  }
}
