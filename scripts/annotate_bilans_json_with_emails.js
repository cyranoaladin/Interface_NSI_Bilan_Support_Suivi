// Annote bilans_evaluation_TAD.json avec les emails connus en base en se basant sur les noms
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length === 0) return { givenName: '', familyName: '' };
  if (parts.length === 1) return { givenName: parts[0], familyName: '' };
  return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}

const toAscii = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const norm = (s) => toAscii(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
const nameKey = (gn, fn) => norm(`${gn} ${fn}`);
const altKey = (gn, fn) => norm(`${fn} ${gn}`);

async function main() {
  const jsonPath = path.resolve('./bilans_evaluation_TAD.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const rows = JSON.parse(raw);

  const students = await prisma.student.findMany({ select: { email: true, givenName: true, familyName: true } });
  const map = new Map();
  for (const s of students) {
    map.set(nameKey(s.givenName, s.familyName), s.email);
    map.set(altKey(s.givenName, s.familyName), s.email);
  }

  let updated = 0;
  for (const r of rows) {
    if (r.student_email) continue;
    const { givenName, familyName } = parseName(r.student_name);
    const email = map.get(nameKey(givenName, familyName)) || map.get(altKey(givenName, familyName));
    if (email) {
      r.student_email = email;
      updated++;
    }
  }

  const outPath = path.resolve('./bilans_evaluation_TAD.annotated.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`[annotate] updated=${updated} -> ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); process.exit(0); });
