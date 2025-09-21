#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure a Group exists to satisfy the required relation
  const group = await prisma.group.upsert({
    where: { code: 'TNSI' },
    update: {},
    create: { name: 'Terminale NSI', code: 'TNSI', academicYear: '2025-2026' },
  });
  console.log(`[seed] Using group ${group.name} (${group.code}) id=${group.id}`);

  const students = [
    { email: 'eleve1@pmf.tn', givenName: 'Élève', familyName: 'Un', classe: 'T12' },
    { email: 'eleve2@pmf.tn', givenName: 'Élève', familyName: 'Deux', classe: 'T12' },
    { email: 'eleve3@pmf.tn', givenName: 'Élève', familyName: 'Trois', classe: 'T12' },
  ];

  for (const s of students) {
    const st = await prisma.student.upsert({
      where: { email: s.email },
      update: {
        givenName: s.givenName,
        familyName: s.familyName,
        classe: s.classe,
        specialites: '',
        active: true,
        passwordHash: 'x', // not used in test-mode login
        passwordChangeRequired: true,
        group: { connect: { code: 'TNSI' } },
      },
      create: {
        email: s.email,
        givenName: s.givenName,
        familyName: s.familyName,
        classe: s.classe,
        specialites: '',
        active: true,
        passwordHash: 'x', // not used in test-mode login
        passwordChangeRequired: true,
        group: { connect: { code: 'TNSI' } },
      },
    });
    console.log(`[seed] Upserted student ${st.email} (${st.familyName} ${st.givenName})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
