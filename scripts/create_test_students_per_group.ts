import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.group.findMany();
  const hash = await bcrypt.hash('password123', 12);
  for (const g of groups) {
    const email = `test.${g.code.toLowerCase()}@ert.tn`;
    const existing = await prisma.student.findUnique({ where: { email } });
    if (!existing) {
      await prisma.student.create({
        data: {
          email,
          givenName: 'Élève',
          familyName: `Test ${g.code}`,
          classe: g.code,
          specialites: 'NSI',
          active: true,
          passwordHash: hash,
          passwordChangeRequired: true,
          groupId: g.id,
        }
      });
      console.log('[TEST] Créé élève:', email);
    } else {
      await prisma.student.update({ where: { email }, data: { groupId: g.id, active: true } });
      console.log('[TEST] Existe déjà:', email);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
