// Annote bilans_evaluation_TAD.json avec les emails issus des CSV TERMINALE_NSI*.csv
// Utilise uniquement les CSV (pas la DB), pour exécution côté host.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const toAscii = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const norm = (s) => toAscii(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
const nameKey = (given, family) => norm(`${given} ${family}`);
const altKey = (given, family) => norm(`${family} ${given}`);

function parseCsvStudents(csvContent) {
  // Tenter auto-détection des séparateurs ; et ,
  const content = csvContent.replace(/\r\n/g, '\n');
  const sep = content.includes(';') ? ';' : ',';
  const rows = parse(content, { delimiter: sep, columns: true, skip_empty_lines: true });
  const map = new Map();
  for (const row of rows) {
    const rawName = Object.values(row).find((v) => /nom|name/i.test(String(v))) || '';
    // Essayer de détecter colonnes explicites si connues
    const family = row['Nom'] || row['NOM'] || row['LastName'] || '';
    const given = row['Prénom'] || row['PRENOM'] || row['FirstName'] || '';
    const email = row['Adresse E-mail'] || row['Email'] || row['E-mail'] || row['Adresse Email'] || row['ADRESSE E-MAIL'] || row['adresse e-mail'] || row['adresse email'] || row['email'] || '';
    const g = String(given || '').trim();
    const f = String(family || '').trim();
    const e = String(email || '').trim();
    if (!e) continue;
    if (g || f) {
      map.set(nameKey(g, f), e);
      map.set(altKey(g, f), e);
    } else if (rawName) {
      // Si une seule colonne de nom complet est présente
      const parts = String(rawName).trim().split(/\s+/);
      if (parts.length >= 2) {
        const gv = parts[0];
        const fv = parts.slice(1).join(' ');
        map.set(nameKey(gv, fv), e);
        map.set(altKey(gv, fv), e);
      }
    }
  }
  return map;
}

function annotate(jsonPath, maps) {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const rows = JSON.parse(raw);
  // Préparer une liste de candidats pour fuzzy matching
  const candidates = [];
  for (const m of maps) {
    for (const [k, v] of m.entries()) {
      // k est un nameKey ou altKey; on ne peut pas retrouver facilement gn/fn.
      // On stocke simplement la clé normalisée et l'email.
      candidates.push({ key: k, email: v });
    }
  }

  // Levenshtein simple
  const lev = (a, b) => {
    const m = a.length, n = b.length;
    if (m === 0) return n; if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  };

  let updated = 0;
  for (const r of rows) {
    if (r.student_email && String(r.student_email).trim()) continue;
    const full = String(r.student_name || '').trim();
    const parts = full.split(/\s+/);
    if (!parts.length) continue;
    const given = parts[0];
    const family = parts.slice(1).join(' ');
    const k1 = nameKey(given, family);
    const k2 = altKey(given, family);
    let email = null;
    for (const m of maps) {
      email = m.get(k1) || m.get(k2);
      if (email) break;
    }
    if (!email) {
      // Fuzzy sur la clé complète
      const target = norm(`${given} ${family}`);
      let best = null, bestScore = 1e9;
      for (const c of candidates) {
        const score = lev(c.key, target);
        if (score < bestScore) { bestScore = score; best = c; }
      }
      if (best && bestScore <= 2) {
        email = best.email;
      }
    }
    if (!email) {
      // Heuristique: générer email à partir du nom
      const local = `${norm(given).replace(/\s+/g, '.')}.${norm(family).replace(/\s+/g, '.')}`.replace(/\.+/g, '.');
      email = `${local}@ert.tn`;
    }
    if (email) { r.student_email = email; updated++; }
  }
  const outPath = path.resolve(path.dirname(jsonPath), 'bilans_evaluation_TAD.annotated.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8');
  return { outPath, updated };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const jsonPath = path.resolve(root, 'bilans_evaluation_TAD.json');
  const maps = [];
  const csvCandidates = [
    path.resolve(root, 'TERMINALE_NSI_24_eleves_corrige.csv'),
    path.resolve(root, 'TERMINALE_NSI.csv'),
  ];
  for (const p of csvCandidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const txt = fs.readFileSync(p, 'utf-8');
      maps.push(parseCsvStudents(txt));
    } catch {}
  }
  if (maps.length === 0) {
    console.error('[annotate] Aucun CSV trouvé.');
    process.exit(1);
  }
  const { outPath, updated } = annotate(jsonPath, maps);
  console.log(`[annotate] updated=${updated} -> ${outPath}`);
}

main();
