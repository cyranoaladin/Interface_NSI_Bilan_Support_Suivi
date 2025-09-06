import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

async function main() {
  const prisma = new PrismaClient();
  try {
    const keep = [
      'alaeddine.benrhouma@ert.tn',
      'pierre.caillabet@ert.tn',
      'hatem.bouhlel@ert.tn',
    ];
    await prisma.teacherOnGroup.deleteMany({ where: { NOT: { teacherEmail: { in: keep } } } });
    const del = await prisma.teacher.deleteMany({ where: { NOT: { email: { in: keep } } } });
    console.log(`Deleted extra teachers: ${del.count}`);
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    process.exit(0);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

