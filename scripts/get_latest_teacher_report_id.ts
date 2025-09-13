import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

async function main() {
  const prisma = new PrismaClient();
  const emailArg = process.argv.find(a => a.startsWith('--email='))?.split('=')[1];
  const studentEmail = emailArg || 'test.terminale@ert.tn';
  const attempt = await prisma.attempt.findFirst({
    where: { studentEmail },
    orderBy: { submittedAt: 'desc' },
    select: { id: true },
  });
  if (!attempt) { console.log(''); await prisma.$disconnect(); return; }
  const report = await prisma.report.findFirst({
    where: { attemptId: attempt.id, type: 'enseignant', pdfUrl: { not: null } },
    orderBy: { publishedAt: 'desc' },
    select: { id: true },
  });
  console.log(report?.id || '');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); process.exit(1); });


