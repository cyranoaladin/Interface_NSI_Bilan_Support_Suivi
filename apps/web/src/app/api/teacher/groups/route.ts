import { getSessionEmail } from '@/lib/auth-utils';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Récupérer les groupes de l'enseignant (sans compter ici)
  const links = await prisma.teacherOnGroup.findMany({
    where: { teacherEmail: email },
    include: { group: true },
  });

  const groupIds = links.map((l) => l.group.id);

  // Compter les élèves par groupe en EXCLUANT les comptes de test
  // Heuristiques utilisées côté seed: emails qui commencent par "test." ou contiennent "+eleve_"
  const counts = await prisma.student.groupBy({
    by: ['groupId'],
    where: {
      groupId: { in: groupIds },
      NOT: {
        OR: [
          { email: { contains: '+eleve_', mode: 'insensitive' } },
          { email: { startsWith: 'test.', mode: 'insensitive' } },
        ],
      },
    },
    _count: { _all: true },
  });

  const countMap = new Map<string, number>();
  for (const c of counts) {
    // @ts-ignore prisma groupBy type
    countMap.set((c as any).groupId, (c as any)._count?._all || 0);
  }

  const groups = links.map(l => ({
    id: l.group.id,
    name: l.group.name,
    code: l.group.code,
    academicYear: l.group.academicYear,
    count: countMap.get(l.group.id) ?? 0,
  }));

  return NextResponse.json({ ok: true, groups });
}
