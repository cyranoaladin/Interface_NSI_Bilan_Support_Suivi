import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'nsi.test@ert.tn';
  const givenName = 'Test';
  const familyName = 'ELEVE';
  const classe = 'T.01';
  const specialites = 'EDS NSI, EDS MATHS';
  const s = await prisma.student.upsert({
    where: { email },
    create: { email, givenName, familyName, classe, specialites, active: true },
    update: { givenName, familyName, classe, specialites, active: true },
  });
  console.log('Created/updated student:', s.email);
}

main().finally(() => prisma.$disconnect());
