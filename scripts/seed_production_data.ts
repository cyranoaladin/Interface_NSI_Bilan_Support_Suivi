import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';
const ACADEMIC_YEAR = '2024-2025';

const GROUPS = [
  { code: 'TNSI', name: 'Terminale NSI', alias: 'term' },
  { code: '1G1', name: 'Première G1', alias: 'g1' },
  { code: '1G2', name: 'Première G2', alias: 'g2' },
  { code: '1G3', name: 'Première G3', alias: 'g3' },
] as const;

type GroupCode = typeof GROUPS[number]['code'];

type CsvRow = {
  'Nom': string;
  'Prénom': string;
  'Adresse E-mail': string;
  'Classe': string;
  'Spécialités gardées': string;
  [k: string]: string;
};

async function clearDatabase() {
  // Supprimer dans un ordre sûr à cause des FK
  await prisma.$transaction([
    prisma.score.deleteMany({}),
    prisma.tag.deleteMany({}),
    prisma.report.deleteMany({}),
  ]);
  await prisma.attempt.deleteMany({});
  await prisma.studentProfileData.deleteMany({});
  await prisma.bilan.deleteMany({});
  await prisma.teacherOnGroup.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.teacher.deleteMany({});
}

async function seedGroups(): Promise<Record<GroupCode, string>> {
  const map: Record<string, string> = {};
  for (const g of GROUPS) {
    const row = await prisma.group.create({
      data: { code: g.code, name: g.name, academicYear: ACADEMIC_YEAR },
    });
    map[g.code] = row.id;
  }
  return map as Record<GroupCode, string>;
}

async function seedTeachers(passwordHash: string) {
  const teachers = [
    { email: 'alaeddine.benrhouma@ert.tn', firstName: 'Alaeddine', lastName: 'Ben Rhouma' },
    { email: 'pierre.caillabet@ert.tn', firstName: 'Pierre', lastName: 'Caillabet' },
    { email: 'hatem.bouhlel@ert.tn', firstName: 'Hatem', lastName: 'Bouhlel' },
  ];
  for (const t of teachers) {
    await prisma.teacher.create({
      data: {
        email: t.email,
        firstName: t.firstName,
        lastName: t.lastName,
        passwordHash: passwordHash,
        passwordChangeRequired: true,
      },
    });
  }
}

async function assignTeachersToGroups(groupIdByCode: Record<GroupCode, string>) {
  // Mapping d’affectation inspiré des affectations existantes
  const assignment: Record<string, GroupCode[]> = {
    'alaeddine.benrhouma@ert.tn': ['TNSI', '1G1'],
    'pierre.caillabet@ert.tn': ['TNSI', '1G1', '1G2'],
    'hatem.bouhlel@ert.tn': ['1G3'],
  };

  for (const [teacherEmail, codes] of Object.entries(assignment)) {
    for (const code of codes) {
      await prisma.teacherOnGroup.create({
        data: { teacherEmail, groupId: groupIdByCode[code], role: 'teacher' },
      });
    }
  }
}

function resolveCsvPaths(): string[] {
  const files = [
    'TERMINALE_NSI.csv',
    'PREMIERE_NSI_G1.csv',
    'PREMIERE_NSI_G2.csv',
    'PREMIERE_NSI_G3.csv',
  ];
  const cwd = process.cwd();
  return files.map((f) => path.resolve(cwd, f));
}

function detectGroupCodeFromClasse(classe: string): GroupCode | undefined {
  const c = (classe || '').trim().toUpperCase();
  if (c === 'TNSI' || c.startsWith('T')) return 'TNSI';
  if (c === '1G1' || c.includes('1.01') || c.includes('1.04') || c.includes('1.07')) return '1G1';
  if (c === '1G2' || c.includes('1.05') || c.includes('1.08') || c.includes('1.10')) return '1G2';
  if (c === '1G3' || c.includes('1.02') || c.includes('1.03') || c.includes('1.06') || c.includes('1.09')) return '1G3';
  return undefined;
}

async function importStudentsFromCsvs(groupIdByCode: Record<GroupCode, string>, passwordHash: string) {
  const paths = resolveCsvPaths();
  let total = 0;
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.warn(`CSV manquant: ${p}`);
      continue;
    }
    const raw = fs.readFileSync(p, 'utf8');
    const records = parse(raw, {
      columns: true,
      delimiter: ';',
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as CsvRow[];

    for (const r of records) {
      const familyName = (r['Nom'] || '').trim();
      const givenName = (r['Prénom'] || '').trim();
      const email = (r['Adresse E-mail'] || '').trim().toLowerCase();
      const classe = (r['Classe'] || '').trim();
      const specialites = (r['Spécialités gardées'] || '').trim();
      if (!email) continue;
      const code = detectGroupCodeFromClasse(classe);
      if (!code) {
        console.warn(`Classe inconnue pour ${email}: '${classe}'`);
        continue;
      }
      const groupId = groupIdByCode[code];
      await prisma.student.create({
        data: {
          email,
          givenName,
          familyName,
          classe: code,
          specialites,
          active: true,
          passwordHash: passwordHash,
          passwordChangeRequired: true,
          groupId,
        },
      });
      total++;
    }
  }
  console.log(`Import élèves terminé: ${total} élèves.`);
}

function aliasFor(code: GroupCode): string {
  const g = GROUPS.find((x) => x.code === code)!;
  return `eleve_${g.alias}`;
}

function localPart(email: string): string {
  return email.split('@')[0];
}

async function createTestStudents(groupIdByCode: Record<GroupCode, string>, passwordHash: string) {
  const assignment: Record<string, GroupCode[]> = {
    'alaeddine.benrhouma@ert.tn': ['TNSI', '1G1'],
    'pierre.caillabet@ert.tn': ['TNSI', '1G1', '1G2'],
    'hatem.bouhlel@ert.tn': ['1G3'],
  };

  let count = 0;
  for (const [teacherEmail, codes] of Object.entries(assignment)) {
    for (const code of codes) {
      const testEmail = `${localPart(teacherEmail)}+${aliasFor(code)}@ert.tn`;
      await prisma.student.create({
        data: {
          email: testEmail,
          givenName: 'Eleve',
          familyName: `Test ${code}`,
          classe: code,
          specialites: '',
          active: true,
          passwordHash: passwordHash,
          passwordChangeRequired: true,
          groupId: groupIdByCode[code],
        },
      });
      count++;
    }
  }
  console.log(`Créés ${count} élèves de test.`);
}

async function main() {
  console.log('Nettoyage de la base...');
  await clearDatabase();
  console.log('OK: base vidée.');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  console.log('Création des groupes...');
  const groupIdByCode = await seedGroups();
  console.log('OK: groupes créés.');

  console.log('Création des enseignants...');
  await seedTeachers(passwordHash);
  console.log('OK: enseignants créés.');

  console.log('Association enseignants ↔ groupes...');
  await assignTeachersToGroups(groupIdByCode);
  console.log('OK: associations créées.');

  console.log('Import des élèves...');
  await importStudentsFromCsvs(groupIdByCode, passwordHash);

  console.log('Création des élèves de test...');
  await createTestStudents(groupIdByCode, passwordHash);

  console.log('Seed production terminé avec succès.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
