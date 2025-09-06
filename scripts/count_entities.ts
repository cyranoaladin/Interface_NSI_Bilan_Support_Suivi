import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

async function main() {
  const prisma = new PrismaClient();
  try {
    const students = await prisma.student.count();
    const teachers = await prisma.teacher.count();
    console.log(`Students: ${students}`);
    console.log(`Teachers: ${teachers}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

