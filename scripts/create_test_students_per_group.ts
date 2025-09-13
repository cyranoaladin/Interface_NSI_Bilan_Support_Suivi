import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

type GroupSpec = { code: string; display: string; testEmail: string; classe: string; };

const GROUPS: GroupSpec[] = [
  { code: 'TEDS-NSI', display: 'Terminale', testEmail: 'test.terminale@ert.tn', classe: 'T.NSI' },
  { code: '1EDS-NSI1', display: 'Première G1', testEmail: 'test.premiere.g1@ert.tn', classe: '1.NSI G1' },
  { code: '1EDS-NSI2', display: 'Première G2', testEmail: 'test.premiere.g2@ert.tn', classe: '1.NSI G2' },
  { code: '1EDS-NSI3', display: 'Première G3', testEmail: 'test.premiere.g3@ert.tn', classe: '1.NSI G3' },
];

const TEACHERS: Array<{ email: string; name: string; groups: string[]; }> = [
  { email: 'alaeddine.benrhouma@ert.tn', name: 'Alaeddine BEN RHOUMA', groups: ['TEDS-NSI', '1EDS-NSI1'] },
  { email: 'pierre.caillabet@ert.tn', name: 'Pierre CAILLABET', groups: ['TEDS-NSI', '1EDS-NSI1', '1EDS-NSI2'] },
  { email: 'hatem.bouhlel@ert.tn', name: 'Hatem BOUHLEL', groups: ['1EDS-NSI3'] },
];

async function upsertTestStudent(groupId: string, spec: GroupSpec) {
  const hash = await bcrypt.hash('password123', 12);
  await prisma.student.upsert({
    where: { email: spec.testEmail },
    create: {
      email: spec.testEmail,
      givenName: 'Test',
      familyName: 'ELEVE',
      classe: spec.classe,
      specialites: 'NSI',
      active: true,
      passwordHash: hash,
      passwordChangeRequired: false,
      groupId,
    },
    update: { groupId },
  });
}

async function main() {
  // Map groups in DB
  const dbGroups = await prisma.group.findMany();
  const codeToGroup = new Map(dbGroups.map((g) => [g.code, g] as const));

  // Create/ensure one test student per target group
  for (const spec of GROUPS) {
    const g = codeToGroup.get(spec.code);
    if (!g) {
      console.warn('Groupe introuvable, skip:', spec.code, spec.display);
      continue;
    }
    await upsertTestStudent(g.id, spec);
  }

  // Affichage enseignants → groupes (avec élève test)
  console.log('=== Enseignants et leurs groupes (avec élève test par groupe) ===');
  for (const t of TEACHERS) {
    const tg = t.groups
      .map((code) => {
        const spec = GROUPS.find((g) => g.code === code);
        return spec ? `${spec.display} (+ ${spec.testEmail})` : code;
      })
      .join(', ');
    console.log(`- ${t.name} (${t.email}) : ${tg}`);
  }

  // Affichage de tous les groupes et leur effectif + élève test
  console.log('\n=== Groupes complets avec élève test ajouté ===');
  for (const spec of GROUPS) {
    const g = codeToGroup.get(spec.code);
    if (!g) continue;
    const students = await prisma.student.findMany({ where: { groupId: g.id }, orderBy: { familyName: 'asc' } });
    const emails = students.map((s) => s.email);
    console.log(`\n${spec.display} [${emails.length} élèves]`);
    for (const e of emails) console.log(`  - ${e}${e === spec.testEmail ? '  (élève test)' : ''}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

