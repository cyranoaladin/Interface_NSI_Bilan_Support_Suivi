#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeHeader() {
  return ['Nom', 'Prénom', 'Adresse E-mail', 'Classe', 'Spécialités gardées'].join(';');
}

function extractEmail(raw) {
  if (!raw) return '';
  const mailto = raw.match(/mailto:([^"'>\s]+)/i);
  if (mailto) return mailto[1].toLowerCase();
  // brute-force: find pattern like xxx@yyy.zz
  const m = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : '';
}

function extractClasse(raw) {
  const m = raw.match(/\bT\.\d+\b/);
  return m ? m[0] : '';
}

function extractSpecialites(raw) {
  const m = raw.match(/EDS[^,\n]*/i);
  return m ? m[0] : '';
}

function splitNameFromLine(line, email) {
  // try first field by semicolon, else by comma
  let firstField = line.split(';')[0];
  if (!firstField || firstField.length > 80) firstField = line.split(',')[0];
  firstField = (firstField || '').replace(/"/g, '').trim();
  let family = firstField.toUpperCase();
  let given = '';
  if (email && email.includes('@')) {
    const local = email.split('@')[0].replace(/-e$/, '');
    const parts = local.split(/[._-]+/);
    if (parts[0]) given = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return { family, given };
}

function cleanHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, '');
}

function main() {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'Export CSV (1).csv'),
    path.join(root, 'TERMINALE_NSI.csv')
  ];
  const src = candidates.find(p => fs.existsSync(p));
  if (!src) { console.error('Fichier source introuvable.'); process.exit(1); }
  const raw = fs.readFileSync(src, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  // Compter données (en-tête supposé 1 ligne)
  const dataCount = Math.max(0, lines.length - 1);
  console.log('Lignes initiales (hors en-tête supposée):', dataCount);

  const out = [];
  out.push(normalizeHeader());

  // Sauter la première ligne (en-tête), puis traiter chaque ligne sans supprimer
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const email = extractEmail(line);
    const { family, given } = splitNameFromLine(line, email);
    const classe = extractClasse(line);
    const specialites = extractSpecialites(cleanHtml(line));
    out.push([family, given, email, classe, specialites].join(';'));
  }

  // Mise à jour des 3 e-mails manquants
  function updateEmail(matchFamily, matchGiven, newEmail) {
    for (let i = 1; i < out.length; i++) {
      const parts = out[i].split(';');
      const fam = parts[0].trim();
      const giv = parts[1].trim();
      const famUp = fam.toUpperCase();
      const givUp = giv.toUpperCase();
      const wantFam = matchFamily.toUpperCase();
      const wantGiv = (matchGiven || '').toUpperCase();
      const famHasBoth = wantGiv ? (famUp.includes(wantFam) && famUp.includes(wantGiv)) : famUp.includes(wantFam);
      const givMatches = !wantGiv || givUp.includes(wantGiv);
      if ((famHasBoth || (famUp.includes(wantFam) && givMatches))) {
        parts[2] = newEmail.toLowerCase();
        out[i] = parts.join(';');
        break;
      }
    }
  }
  updateEmail('JAAFAR', 'YOUSSEF', 'youssef.jaafar-e@ert.tn');
  updateEmail('MAATOUG', 'SAFA', 'safa.maatoug-e@ert.tn');
  updateEmail('MECHICHI', 'MEHDI', 'mehdi.mechichi-e@ert.tn');

  const dst = path.join(root, 'TERMINALE_NSI_24_eleves_corrige.csv');
  fs.writeFileSync(dst, out.join('\n'), 'utf8');
  const outLines = out.length - 1;
  console.log('Écrit:', dst, 'Lignes élèves =', outLines);
}

main();
