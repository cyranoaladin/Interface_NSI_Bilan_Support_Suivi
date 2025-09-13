import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

type GroupDef = { key: string; display: string; csv: string; testEmail: string; };
const GROUPS: GroupDef[] = [
  { key: 'Terminale', display: 'Terminale', csv: 'TERMINALE_NSI_24_eleves_corrige.csv', testEmail: 'test.terminale@ert.tn' },
  { key: 'PremiereG1', display: 'Première G1', csv: 'PREMIERE_NSI_G1.csv', testEmail: 'test.premiere.g1@ert.tn' },
  { key: 'PremiereG2', display: 'Première G2', csv: 'PREMIERE_NSI_G2.csv', testEmail: 'test.premiere.g2@ert.tn' },
  { key: 'PremiereG3', display: 'Première G3', csv: 'PREMIERE_NSI_G3.csv', testEmail: 'test.premiere.g3@ert.tn' },
];

const TEACHERS = [
  { email: 'alaeddine.benrhouma@ert.tn', name: 'Alaeddine BEN RHOUMA', groups: ['Terminale', 'PremiereG1'] },
  { email: 'pierre.caillabet@ert.tn', name: 'Pierre CAILLABET', groups: ['Terminale', 'PremiereG1', 'PremiereG2'] },
  { email: 'hatem.bouhlel@ert.tn', name: 'Hatem BOUHLEL', groups: ['PremiereG3'] },
];

function extractEmailsFromCSV(csvPath: string): string[] {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV introuvable: ${csvPath}`);
  const raw = fs.readFileSync(csvPath, 'utf8');
  const cleaned = raw.replace(/<[^>]*>/g, '');
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const delimiter = ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length) ? ';' : ',';
  const rows = parse(cleaned, { columns: true, delimiter, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true, relax_quotes: true, escape: '\\' }) as any[];
  const emailHeaders = ['Email', 'email', 'E-mail', 'E-Mail', 'Adresse e-mail', 'Adresse E-mail', 'Adresse email'];
  const emails: string[] = [];
  for (const r of rows as any[]) {
    let email = '';
    for (const h of emailHeaders) {
      if ((r as any)[h] && String((r as any)[h]).trim() !== '') { email = String((r as any)[h]).trim(); break; }
    }
    // strip leftover mailto or html
    const mailto = email.match(/mailto:([^"'>]+)/i);
    if (mailto) email = mailto[1];
    email = email.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (email) emails.push(email);
  }
  return emails;
}

async function main() {
  // 1) Affichage enseignants -> groupes (avec élève test)
  console.log('=== Enseignants & Groupes (avec élève test par groupe) ===');
  for (const t of TEACHERS) {
    const parts = t.groups.map((k) => {
      const g = GROUPS.find((x) => x.key === k)!; return `${g.display} (+ ${g.testEmail})`;
    });
    console.log(`- ${t.name} (${t.email}) : ${parts.join(', ')}`);
  }

  // 2) Validation: tous les élèves des CSV ont une adresse mail + effectifs attendus (hors élève test)
  console.log('\n=== Validation CSV (emails présents & effectifs) ===');
  const expected: Record<string, number> = { Terminale: 24, PremiereG1: 22, PremiereG2: 17, PremiereG3: 20 };
  for (const g of GROUPS) {
    const p = path.resolve(process.cwd(), g.csv);
    const emails = extractEmailsFromCSV(p);
    const missing = emails.filter((e) => !/^[^@]+@[^@]+\.[^@]+$/.test(e));
    if (missing.length > 0) console.warn(`[WARN] ${g.display}: ${missing.length} emails invalides`);
    console.log(`${g.display}: ${emails.length} élèves (attendu=${expected[g.key]})`);
  }

  // 3) Vérifier le nombre d’enseignants (en base)
  const teachersCount = await prisma.teacher.count();
  console.log(`\nEnseignants (en base): ${teachersCount} (attendu=3)`);

  // 4) Affichage complet des groupes depuis les CSV, avec ajout de l’élève test
  console.log('\n=== Groupes complets (CSV) avec élève test ajouté ===');
  for (const g of GROUPS) {
    const p = path.resolve(process.cwd(), g.csv);
    const emails = extractEmailsFromCSV(p);
    const full = [...emails, g.testEmail];
    console.log(`\n${g.display} [${emails.length} + 1 test = ${full.length}]`);
    for (const e of full) console.log(`  - ${e}${e === g.testEmail ? '  (élève test)' : ''}`);
  }

  // 5) Sanity: flags de mot de passe (première connexion) sur quelques élèves importés
  const anyStudent = await prisma.student.findFirst();
  if (anyStudent) {
    console.log('\nExemple flag first-login (passwordChangeRequired) sur un élève existant:', (anyStudent as any).passwordChangeRequired);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
