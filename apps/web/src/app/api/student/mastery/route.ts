import { prisma } from "@/lib/prisma";
import { getSession, assertRole } from "@/lib/auth-utils";
import { ok, err } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    assertRole(session, ["STUDENT"]);
    const mastery = await prisma.studentMastery.findMany({
      where: { studentId: session!.sub! },
      select: { notionId: true, mastery: true },
    });
    return ok({ mastery });
  } catch (e: any) {
    const status = e?.status ?? 400;
    return err("mastery_failed", e?.message, { status });
  }
}
