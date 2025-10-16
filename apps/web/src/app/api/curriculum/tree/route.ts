import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/http";

export async function GET() {
  try {
    const themes = await prisma.currTheme.findMany({
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
      include: {
        notions: { orderBy: { order: "asc" }, select: { id: true, code: true, title: true, order: true } },
      },
    });
    return ok({ themes });
  } catch (e: any) {
    return err("failed_to_load_curriculum", e?.message);
  }
}
