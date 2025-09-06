import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const teachers = [
    { email: 'alaeddine.benrhouma@ert.tn', firstName: 'Alaeddine', lastName: 'Ben Rhouma' },
    { email: 'hatem.bouhlel@ert.tn', firstName: 'Hatem', lastName: 'Bouhlel' },
    { email: 'pierre.caillabet@ert.tn', firstName: 'Pierre', lastName: 'Caillabet' },
  ];
  const groups = [
    { code: 'TEDS-NSI', name: 'TEDS NSI', academicYear: '2024-2025' }, // Terminale NSI
    { code: '1EDS-NSI1', name: '1EDS NSI1', academicYear: '2024-2025' }, // Première NSI GR1
    { code: '1EDS-NSI2', name: '1EDS NSI2', academicYear: '2024-2025' }, // Première NSI GR2
    { code: '1EDS-NSI3', name: '1EDS NSI3', academicYear: '2024-2025' }, // Première NSI GR3
  ];
  const password = 'password123';
  const hash = await bcrypt.hash(password, 12);
  // Upsert des groupes
  const groupMap: Record<string, string> = {};
  for (const g of groups) {
    const res = await prisma.group.upsert({
      where: { code: g.code },
      update: { name: g.name, academicYear: g.academicYear },
      create: { code: g.code, name: g.name, academicYear: g.academicYear },
    });
    groupMap[g.code] = res.id;
  }

  for (const t of teachers) {
    await prisma.teacher.upsert({
      where: { email: t.email },
      update: { firstName: t.firstName, lastName: t.lastName, passwordHash: hash, passwordChangeRequired: true },
      create: { email: t.email, firstName: t.firstName, lastName: t.lastName, passwordHash: hash, passwordChangeRequired: true },
    });
  }

  // Associations enseignants ↔ groupes
  const assign = async (teacherEmail: string, codes: string[]) => {
    const teacher = await prisma.teacher.findUnique({ where: { email: teacherEmail } });
    if (!teacher) return;
    for (const code of codes) {
      const gid = groupMap[code];
      if (!gid) continue;
      await prisma.teacherOnGroup.upsert({
        where: { teacherEmail_groupId: { teacherEmail: teacher.email, groupId: gid } },
        update: {},
        create: { teacherEmail: teacher.email, groupId: gid, role: 'teacher' },
      });
    }
  };

  await assign('alaeddine.benrhouma@ert.tn', ['TEDS-NSI', '1EDS-NSI1']);
  await assign('hatem.bouhlel@ert.tn', ['1EDS-NSI3']);
  await assign('pierre.caillabet@ert.tn', ['TEDS-NSI', '1EDS-NSI1', '1EDS-NSI2']);
  console.log('Seed enseignants OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
