import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/http";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const sub = await prisma.quizSubmission.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            grading: true,
            quizItem: { select: { id: true, exerciseId: true } },
          },
        },
      },
    });
    if (!sub) return err("not_found", undefined, { status: 404 });

    const scores = sub.items.map(i => i.grading?.score ?? 0);
    const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return ok({
      submissionId: sub.id,
      score,
      items: sub.items.map(i => ({
        quizItemId: i.quizItemId,
        score: i.grading?.score ?? 0,
        feedback: i.grading?.openFeedbackJson ?? null,
        codeReview: i.grading?.codeReviewJson ?? null,
      })),
    });
  } catch (e: any) {
    return err("result_failed", e?.message);
  }
}
