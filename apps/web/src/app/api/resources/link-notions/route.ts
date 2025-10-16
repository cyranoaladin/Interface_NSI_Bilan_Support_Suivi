import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, assertRole } from "@/lib/auth";
import { ok, err } from "@/lib/http";

const Body = z.object({
  resourceId: z.string().min(1),
  notionIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    assertRole(session, ["TEACHER"]);
    const { resourceId, notionIds } = Body.parse(await req.json());

    await prisma.$transaction([
      prisma.resourceNotion.deleteMany({ where: { resourceId } }),
      prisma.resourceNotion.createMany({ data: notionIds.map(notionId => ({ resourceId, notionId })) }),
    ]);

    return ok({ linked: notionIds.length });
  } catch (e: any) {
    return err("link_failed", e?.message);
  }
}
