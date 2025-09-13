import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1] || 'test.terminale@ert.tn';
  const password = process.argv.find((a) => a.startsWith('--password='))?.split('=')[1] || 'password123';
  const hash = await bcrypt.hash(password, 12);
  const st = await prisma.student.findUnique({ where: { email } });
  if (!st) {
    // create minimally in first available group
    const g = await prisma.group.findFirst();
    if (!g) throw new Error('Aucun groupe trouvé');
    await prisma.student.create({
      data: {
        email,
        givenName: 'Test',
        familyName: 'ELEVE',
        classe: 'NSI',
        specialites: 'NSI',
        active: true,
        passwordHash: hash,
        passwordChangeRequired: false,
        groupId: g.id,
      }
    });
    console.log('Créé élève:', email);
  } else {
    await prisma.student.update({ where: { email }, data: { passwordHash: hash, passwordChangeRequired: false } });
    console.log('Mis à jour mot de passe pour:', email);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

