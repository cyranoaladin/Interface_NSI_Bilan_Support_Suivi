#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const students = [
    { email: 'eleve1@pmf.tn', givenName: 'Élève', familyName: 'Un', classe: 'T12' },
    { email: 'eleve2@pmf.tn', givenName: 'Élève', familyName: 'Deux', classe: 'T12' },
    { email: 'eleve3@pmf.tn', givenName: 'Élève', familyName: 'Trois', classe: 'T12' },
  ];
  for (const s of students) {
    await prisma.student.upsert({
      where: { email: s.email },
      update: { givenName: s.givenName, familyName: s.familyName, classe: s.classe, active: true },
      create: { email: s.email, givenName: s.givenName, familyName: s.familyName, classe: s.classe, active: true },
    });
    console.log('Seeded student:', s.email);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); process.exit(1); });
