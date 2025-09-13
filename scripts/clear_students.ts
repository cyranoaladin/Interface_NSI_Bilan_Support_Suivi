import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

function hasFlag(name: string): boolean {
  const norm = name.replace(/^--/, '');
  return process.argv.slice(2).some((a) => a.replace(/^--/, '') === norm);
}

async function main() {
  const keepUsers = hasFlag('keep-users');

  // Données transactionnelles liées aux bilans/scorings/rapports
  await prisma.report.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.score.deleteMany();
  await prisma.attempt.deleteMany();
  try { await (prisma as any).studentProfileData.deleteMany(); } catch {}
  try { await (prisma as any).bilan.deleteMany(); } catch {}

  if (!keepUsers) {
    // Purge complète des élèves si demandé (par défaut ancien comportement)
    await prisma.student.deleteMany();
    console.log('Données transactionnelles + étudiants supprimés.');
  } else {
    console.log('Données transactionnelles supprimées. Étudiants/Enseignants/Groupes conservés.');
  }
}

main().finally(() => prisma.$disconnect());
