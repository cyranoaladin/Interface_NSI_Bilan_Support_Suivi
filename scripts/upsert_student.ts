import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_STUDENT_EMAIL || 'alaeddine.benrhouma+eleve_term@ert.tn';
  const givenName = 'Eleve';
  const familyName = 'Test TNSI';
  const groupeCode = process.env.TEST_GROUP_CODE || 'TNSI';
  const classe = groupeCode;

  const group = await prisma.group.findUnique({ where: { code: groupeCode } });
  if (!group) {
    throw new Error(`Groupe ${groupeCode} introuvable. Seed des groupes requis.`);
  }
  const hash = await bcrypt.hash('password123', 12);

  await prisma.student.upsert({
    where: { email },
    update: { groupId: group.id, active: true, passwordChangeRequired: true, passwordHash: hash },
    create: {
      email,
      givenName,
      familyName,
      classe,
      specialites: 'NSI',
      active: true,
      passwordHash: hash,
      passwordChangeRequired: true,
      groupId: group.id,
    },
  });

  console.log(`OK: étudiant prêt ${email} → groupe ${groupeCode}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
