import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'test.eleve@ert.tn';
  const hash = await bcrypt.hash('password123', 12);
  // Pick first group
  const g = await prisma.group.findFirst();
  if (!g) throw new Error('No group');
  await prisma.student.upsert({
    where: { email },
    create: { email, givenName: 'Test', familyName: 'ELEVE', classe: 'T.03', specialites: 'NSI/Math', active: true, passwordHash: hash, passwordChangeRequired: false, groupId: g.id },
    update: { groupId: g.id }
  });
  await prisma.studentProfileData.upsert({
    where: { studentEmail: email },
    create: {
      studentEmail: email,
      pedagoRawAnswers: {
        motivation_globale: 4,
        attitude_cours: 'Très active',
        engagement_travail_perso: 4,
        leviers_investissement: ['projets', 'défi intellectuel', 'utilité concrète'],
        craintes_anticipees_nsi: 'Charge de travail et difficulté des projets',
        utilise_documentation: 3,
        decompose_probleme_code: 4,
        utilise_tests_code: 3,
        documente_code: 3,
        organisation_hebdo: 'Planning écrit détaillé',
        temps_nsi_hors_classe: '2-3h',
        autonomie_projets: 3,
        journee_productive_vs_inefficace: 'Productif: matin calme; Moins efficace: fin de journée',
      },
    },
    update: {}
  });
  console.log('OK test student created:', email);
}

main().finally(() => prisma.$disconnect());

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
