import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  await prisma.report.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.score.deleteMany();
  await prisma.attempt.deleteMany();
  try { await (prisma as any).studentProfileData.deleteMany(); } catch {}
  try { await (prisma as any).bilan.deleteMany(); } catch {}
  await prisma.student.deleteMany();
  console.log('Tables vidées.');
}

main().finally(() => prisma.$disconnect());
