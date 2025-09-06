import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const HEADERS: Record<string, string[]> = {
  email: ['Email', 'email', 'E-mail', 'E-Mail', 'Adresse e-mail', 'Adresse E-mail', 'Adresse email'],
  givenName: ['Prénom', 'Prenom', 'First Name'],
  familyName: ['Nom', 'Last Name'],
  classe: ['Classe', 'Classe/Grp'],
  specialites: ['Spécialités gardées', 'Spécialités', 'Specialites', 'Enseignements de spécialité', 'Autres options'],
  id: ['ID', 'Id', 'Identifiant']
};

function pick(record: any, keys: string[]): string | undefined {
  for (const k of keys) if (record[k] != null && String(record[k]).trim() !== '') return String(record[k]).trim();
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='));
  // Par défaut, utiliser le CSV corrigé à 24 élèves
  const file = fileArg ? fileArg.split('=')[1] : 'TERMINALE_NSI_24_eleves_corrige.csv';
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) throw new Error(`CSV introuvable: ${p}`);

  const raw = fs.readFileSync(p, 'utf8');
  // Supprimer les balises HTML (ancres, icônes) qui cassent les guillemets du CSV
  const cleaned = raw.replace(/<[^>]*>/g, '');
  // Détection simple du délimiteur
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const delimiter = countSemi >= countComma ? ';' : ',';
  let ok = 0, ko = 0;
  const defaultHash = await bcrypt.hash('password123', 12);
  try {
    const rows = parse(cleaned, { columns: true, delimiter, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true, relax_quotes: true, escape: '\\' });
    for (const r of rows) {
      let emailRaw = (pick(r, HEADERS.email) || '').trim();
      const mailto = emailRaw.match(/mailto:([^"'>]+)/i);
      if (mailto) emailRaw = mailto[1];
      emailRaw = emailRaw.replace(/<[^>]*>/g, '').trim();
      const email = emailRaw.toLowerCase();

      let givenName = pick(r, HEADERS.givenName) || '';
      let familyName = pick(r, HEADERS.familyName) || '';
      const classe = pick(r, HEADERS.classe) || '';
      const specialites = pick(r, HEADERS.specialites) || '';

      if ((!givenName || !familyName) && email.includes('@')) {
        const local = email.split('@')[0].replace(/-e$/, '');
        const parts = local.split(/[._-]+/);
        if (!givenName && parts[0]) givenName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        if (!familyName && parts[1]) familyName = parts[1].toUpperCase();
      }
      if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { ko++; continue; }
      try {
        await prisma.student.upsert({
          where: { email },
          create: { email, givenName, familyName, classe, specialites, active: true, passwordHash: defaultHash, passwordChangeRequired: true },
          update: { givenName, familyName, classe, specialites, active: true }
        });
        ok++;
      } catch (e) {
        console.error('Erreur upsert', email, e);
        ko++;
      }
    }
  } catch (e) {
    // Fallback ultra-robuste: parser chaque ligne à la main et extraire email/nom/classe
    const lines = cleaned.split(/\r?\n/).filter(l => l.trim() !== '');
    // skip header if contains 'E-mail' or 'Classe'
    const startIdx = lines.findIndex(l => /E-mail|Classe|Email/i.test(l));
    const slice = startIdx >= 0 ? lines.slice(startIdx + 1) : lines;
    for (const line of slice) {
      const emailMatch = line.match(/mailto:([^"'>]+)/i);
      const email = (emailMatch ? emailMatch[1] : '').toLowerCase();
      if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { ko++; continue; }
      // Nom complet est souvent au début avant la première virgule
      const firstField = line.split(',')[0] || '';
      let familyName = firstField.trim().toUpperCase();
      let givenName = '';
      // Essayer de dériver prénom depuis l'email local-part
      const local = email.split('@')[0].replace(/-e$/, '');
      const parts = local.split(/[._-]+/);
      if (parts[0]) givenName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      // Classe: chercher T.xx
      const classeMatch = line.match(/\bT\.\d+\b/);
      const classe = classeMatch ? classeMatch[0] : '';
      // Spécialités: capter segment 'EDS ...' si présent
      const specMatch = line.match(/EDS[^,\n]*/i);
      const specialites = specMatch ? specMatch[0] : '';
      try {
        await prisma.student.upsert({
          where: { email },
          create: { email, givenName, familyName, classe, specialites, active: true, passwordHash: defaultHash, passwordChangeRequired: true },
          update: { givenName, familyName, classe, specialites, active: true }
        });
        ok++;
      } catch (e2) {
        console.error('Erreur upsert', email, e2);
        ko++;
      }
    }
  }
  console.log(`Import terminé. OK=${ok} KO=${ko}`);
}

main().finally(() => prisma.$disconnect());
