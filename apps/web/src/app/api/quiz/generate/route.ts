import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, err } from "@/lib/http";

const Body = z.object({
  target: z.object({
    studentId: z.string().min(1).optional(),
    notionIds: z.array(z.string().min(1)).optional(),
  }),
  size: z.number().int().min(1).max(30).default(8),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.sub) return err("unauthorized", undefined, { status: 401 });

    const { target, size, difficulty } = Body.parse(await req.json());

    const where = target.notionIds?.length
      ? { notions: { some: { notionId: { in: target.notionIds } } }, difficulty }
      : { difficulty } as any;

    const picks = await prisma.exercise.findMany({
      where,
      take: size,
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const quiz = await prisma.quiz.create({
      data: {
        title: null,
        createdById: session.sub,
        studentId: target.studentId ?? null,
        items: {
          create: picks.map((e, idx) => ({ order: idx + 1, exerciseId: e.id })),
        },
      },
      select: { id: true },
    });

    return ok({ quizId: quiz.id });
  } catch (e: any) {
    return err("generate_failed", e?.message);
  }
}
