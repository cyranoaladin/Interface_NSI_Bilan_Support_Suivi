import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapping: Record<string, string[]> = {
  'alaeddine.benrhouma@ert.tn': ['TNSI', '1G1'],
  'pierre.caillabet@ert.tn': ['TNSI', '1G1', '1G2'],
  'hatem.bouhlel@ert.tn': ['1G3']
};

async function main() {
  for (const [teacherEmail, codes] of Object.entries(mapping)) {
    const teacher = await prisma.teacher.findUnique({ where: { email: teacherEmail } });
    if (!teacher) {
      console.warn('[ASSOC] Enseignant introuvable:', teacherEmail);
      continue;
    }
    for (const code of codes) {
      const group = await prisma.group.findUnique({ where: { code } });
      if (!group) {
        console.warn('[ASSOC] Groupe introuvable:', code);
        continue;
      }
      const existing = await prisma.teacherOnGroup.findUnique({ where: { teacherEmail_groupId: { teacherEmail, groupId: group.id } } });
      if (existing) {
        console.log('[ASSOC] Déjà lié:', teacherEmail, '->', code);
        continue;
      }
      await prisma.teacherOnGroup.create({ data: { teacherEmail, groupId: group.id, role: 'teacher' } });
      console.log('[ASSOC] Lié:', teacherEmail, '->', code);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
