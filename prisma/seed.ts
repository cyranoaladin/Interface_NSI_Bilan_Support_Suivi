import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 12);
  const teachers = [
    { email: 'alaeddine.benrhouma@ert.tn', firstName: 'Alaeddine', lastName: 'Ben Rhouma' },
    { email: 'pierre.caillabet@ert.tn', firstName: 'Pierre', lastName: 'Caillabet' },
    { email: 'hatem.bouhlel@ert.tn', firstName: 'Hatem', lastName: 'Bouhlel' },
  ];
  for (const t of teachers) {
    await prisma.teacher.upsert({
      where: { email: t.email },
      update: { firstName: t.firstName, lastName: t.lastName, passwordHash: hash, passwordChangeRequired: true },
      create: { email: t.email, firstName: t.firstName, lastName: t.lastName, passwordHash: hash, passwordChangeRequired: true },
    });
  }
  console.log('Seed de base Prisma terminé.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
