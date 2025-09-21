import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const HEADERS: Record<string, string[]> = {
  email: ['Email', 'email', 'Adresse e-mail', 'Adresse E-mail', 'Adresse email'],
  givenName: ['Prénom', 'Prenom', 'First Name', 'GivenName', 'givenName'],
  familyName: ['Nom', 'Last Name', 'FamilyName', 'familyName'],
  classe: ['Classe', 'Classe/Grp', 'classe']
};

function pick(row: any, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
}

function deriveGroupFromFilename(filePath: string): { code: string; name: string; } {
  const base = path.basename(filePath).toLowerCase();
  if (base.includes('terminale')) return { code: 'TNSI', name: 'Terminale NSI' };
  if (base.includes('premiere') && base.includes('g1')) return { code: 'PNSI-G1', name: 'Première NSI - Groupe 1' };
  if (base.includes('premiere') && base.includes('g2')) return { code: 'PNSI-G2', name: 'Première NSI - Groupe 2' };
  if (base.includes('premiere') && base.includes('g3')) return { code: 'PNSI-G3', name: 'Première NSI - Groupe 3' };
  if (base.includes('premiere')) return { code: 'PNSI', name: 'Première NSI' };
  return { code: 'NSI', name: 'NSI' };
}

async function ensureGroup(code: string, name: string, academicYear = '2025-2026') {
  const existing = await prisma.group.findUnique({ where: { code } });
  if (existing) return existing;
  return prisma.group.create({ data: { code, name, academicYear } });
}

async function main() {
  const csvCandidates = [
    'TERMINALE_NSI.csv',
    'TERMINALE_NSI_24_eleves_corrige.csv',
    'PREMIERE_NSI_G1.csv',
    'PREMIERE_NSI_G2.csv',
    'PREMIERE_NSI_G3.csv'
  ];

  const files: string[] = [];
  for (const f of csvCandidates) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) files.push(p);
  }
  if (files.length === 0) {
    console.error('Aucun CSV trouvé parmi:', csvCandidates.join(', '));
    process.exit(1);
  }

  const emailToRow = new Map<string, { givenName: string; familyName: string; classe: string; file: string; }>();

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const cleaned = raw.replace(/<[^>]*>/g, '');
    const rows = parse(cleaned, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true, relax_column_count: true, relax_quotes: true, escape: '\\' });
    for (const r of rows) {
      let email = (pick(r, HEADERS.email) || '').toLowerCase();
      const mailto = email.match(/mailto:([^"'>]+)/i);
      if (mailto) email = mailto[1].toLowerCase();
      if (!email || !email.endsWith('@ert.tn')) continue;
      const givenName = pick(r, HEADERS.givenName) || '';
      const familyName = pick(r, HEADERS.familyName) || '';
      const classe = (pick(r, HEADERS.classe) || '').toUpperCase() || deriveGroupFromFilename(file).code;
      if (!emailToRow.has(email)) emailToRow.set(email, { givenName, familyName, classe, file });
    }
  }

  console.log(`[CSV] Uniques à importer: ${emailToRow.size}`);

  // Préparer groupes rencontrés
  const groupCache = new Map<string, string>(); // code -> id
  for (const { classe, file } of emailToRow.values()) {
    if (groupCache.has(classe)) continue;
    const d = deriveGroupFromFilename(file);
    const grp = await ensureGroup(classe || d.code, `Classe ${classe || d.name}`);
    groupCache.set(classe, grp.id);
  }

  const passwordHash = await bcrypt.hash('password123', 12);

  let created = 0, updated = 0;
  for (const [email, r] of emailToRow.entries()) {
    const groupId = groupCache.get(r.classe);
    if (!groupId) {
      const g = await ensureGroup(r.classe, `Classe ${r.classe}`);
      groupCache.set(r.classe, g.id);
    }
    const existing = await prisma.student.findUnique({ where: { email } });
    if (!existing) {
      await prisma.student.create({
        data: {
          email,
          givenName: r.givenName || 'Élève',
          familyName: r.familyName || 'NSI',
          classe: r.classe,
          specialites: 'NSI',
          active: true,
          passwordHash,
          passwordChangeRequired: true,
          groupId: groupCache.get(r.classe) as string,
        }
      });
      created++;
    } else {
      await prisma.student.update({
        where: { email },
        data: {
          givenName: r.givenName || existing.givenName,
          familyName: r.familyName || existing.familyName,
          classe: r.classe || existing.classe,
          groupId: groupCache.get(r.classe) as string,
          active: true,
          passwordChangeRequired: true,
          passwordHash,
        }
      });
      updated++;
    }
  }

  console.log(`[IMPORT] Créés: ${created}, Mis à jour: ${updated}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
