import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, assertRole } from "@/lib/auth";
import { ok, err } from "@/lib/http";

const Body = z.object({
  entries: z.array(z.object({
    notionId: z.string().min(1),
    coveredAt: z.string().datetime().optional(),
    durationMin: z.number().int().min(0).optional(),
    notes: z.string().max(2000).optional(),
    groupId: z.string().min(1).optional(),
  })).min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    assertRole(session, ["TEACHER"]);
    const { entries } = Body.parse(await req.json());

    const created = await prisma.$transaction(entries.map(e =>
      prisma.teacherCoverage.create({
        data: {
          teacherId: session!.sub!,
          notionId: e.notionId,
          coveredAt: e.coveredAt ? new Date(e.coveredAt) : new Date(),
          durationMin: e.durationMin ?? 0,
          notes: e.notes ?? null,
          groupId: e.groupId ?? null,
        },
      })
    ));

    return ok({ created: created.length });
  } catch (e: any) {
    const status = e?.status ?? 400;
    return err("coverage_failed", e?.message, { status });
  }
}
