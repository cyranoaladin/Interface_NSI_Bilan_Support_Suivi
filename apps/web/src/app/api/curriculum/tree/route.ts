import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId') || undefined;

  // Build a tree from CurrTheme (with parent/children) and Notion under leaf themes
  const themes = await prisma.currTheme.findMany({
    where: { parentId: { not: null } },
    orderBy: { order: 'asc' },
    include: {
      children: { orderBy: { order: 'asc' } },
      notions: { orderBy: { order: 'asc' } },
    },
  });

  // Coverage aggregation from TeacherCoverage if available
  let coverage: any[] = [];
  try {
    if (groupId) {
      coverage = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "notionId", COUNT(*)::int AS count
         FROM "TeacherCoverage" WHERE "groupId" = $1
         GROUP BY "notionId"`,
        groupId
      );
    } else {
      coverage = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "notionId", COUNT(*)::int AS count
         FROM "TeacherCoverage" GROUP BY "notionId"`
      );
    }
  } catch {}

  return NextResponse.json({ tree: themes, coverage });
}
