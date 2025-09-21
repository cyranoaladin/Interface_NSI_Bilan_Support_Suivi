#!/usr/bin/env npx ts-node
/**
 * Script de vérification des sources RAG avant ingestion
 * Effectue un dry-run pour lister les fichiers qui seraient ingérés et vérifier leur existence
 */
import * as fs from 'fs';
import * as path from 'path';

console.log('=== Vérification des sources RAG ===\n');

// Fonction pour résoudre les chemins /app vers locaux si nécessaire
function resolvePath(pth: string): string {
  if (!pth) return pth;
  if (fs.existsSync(pth)) return pth;
  if (pth.startsWith('/app/')) {
    const local = path.join(process.cwd(), pth.replace('/app/', ''));
    if (fs.existsSync(local)) return local;
  }
  return pth;
}

// Lire la configuration questionnaire pour récupérer reporting.rag
const qPaths = [
  '/app/data/questionnaire_nsi_terminale.final.json',
  path.resolve(process.cwd(), 'data/questionnaire_nsi_terminale.final.json')
];

let config: any = {};
for (const p of qPaths) { 
  if (fs.existsSync(p)) { 
    console.log(`✅ Configuration trouvée: ${p}`);
    config = JSON.parse(fs.readFileSync(p, 'utf8')); 
    break; 
  } 
}

const ragCfg = (config.reporting && config.reporting.rag) || {};
console.log('\n📋 Configuration RAG:');
console.log(JSON.stringify(ragCfg, null, 2));

const primary = ragCfg.primary_guide as { path: string; label?: string; };
const contextual = Array.isArray(ragCfg.contextual_sources) ? ragCfg.contextual_sources as Array<{ path: string; label?: string; }> : [];

let sources: Array<{ path: string; label: string; }> = [];

// Ajouter les sources configurées
if (primary?.path) {
  sources.push({ 
    path: resolvePath(primary.path), 
    label: primary.label || 'Guide Pédagogique NSI PMF' 
  });
}

for (const s of contextual) { 
  if (s?.path) {
    sources.push({ 
      path: resolvePath(s.path), 
      label: s.label || path.basename(s.path) 
    });
  }
}

console.log('\n📚 Sources configurées:');
if (sources.length === 0) {
  console.log('⚠️  Aucune source configurée');
} else {
  sources.forEach(s => {
    const exists = fs.existsSync(s.path);
    const status = exists ? '✅' : '❌';
    const size = exists ? `(${(fs.statSync(s.path).size / 1024 / 1024).toFixed(2)} MB)` : '';
    console.log(`${status} ${s.label}: ${s.path} ${size}`);
  });
}

// Vérifier si fallback nécessaire
const needsDefault = sources.length === 0 || sources.some(s => s.path.startsWith('/mnt/data'));
if (needsDefault) {
  console.log('\n⚠️  Fallback activé (sources manquantes ou chemins /mnt/data détectés)');
  
  // Tester les chemins possibles pour rag_sources
  const bases = [
    '/app/data/rag_sources',
    path.join(process.cwd(), 'data', 'rag_sources')
  ];
  
  let base = '';
  for (const b of bases) {
    if (fs.existsSync(b)) {
      base = b;
      console.log(`📁 Répertoire rag_sources trouvé: ${b}`);
      break;
    }
  }
  
  if (!base) {
    console.log('❌ Aucun répertoire rag_sources trouvé');
    console.log('   Chemins testés:', bases);
  } else {
    const defaults = [
      { p: path.join(base, 'programme_nsi_premiere.pdf'), l: 'Programme NSI Première' },
      { p: path.join(base, 'programme_nsi_terminale.pdf'), l: 'Programme NSI Terminale' },
      { p: path.join(base, 'vademecum-snt-nsi_0.pdf'), l: 'Vademecum SNT-NSI' },
      { p: path.join(base, 'RCP_ Référentiel de compétences en programmation - vue formulaire.pdf'), l: 'RCP Vue formulaire' },
      { p: path.join(base, 'RCP_Référentiel de compétences en programmation_vue détaillée.pdf'), l: 'Référentiel Compétences Programmation' },
    ];
    
    console.log('\n📚 Sources par défaut:');
    for (const d of defaults) {
      const exists = fs.existsSync(d.p);
      const status = exists ? '✅' : '❌';
      const size = exists ? `(${(fs.statSync(d.p).size / 1024 / 1024).toFixed(2)} MB)` : '';
      console.log(`${status} ${d.l}: ${d.p} ${size}`);
      if (exists) sources.push({ path: d.p, label: d.l });
    }
  }
}

console.log('\n📊 Résumé:');
const existingSources = sources.filter(s => fs.existsSync(s.path));
console.log(`- Total sources identifiées: ${sources.length}`);
console.log(`- Sources existantes: ${existingSources.length}`);
console.log(`- Sources manquantes: ${sources.length - existingSources.length}`);

if (existingSources.length > 0) {
  const totalSize = existingSources.reduce((acc, s) => acc + fs.statSync(s.path).size, 0);
  console.log(`- Taille totale: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

// Vérifier les variables d'environnement
console.log('\n🔧 Variables d\'environnement:');
const envVars = [
  'DATABASE_URL',
  'EMBEDDING_PROVIDER',
  'GEMINI_API_KEY',
  'GEMINI_EMBEDDINGS_MODEL',
  'VECTOR_DIM'
];

envVars.forEach(v => {
  const value = process.env[v];
  if (v === 'DATABASE_URL' && value) {
    // Masquer les informations sensibles
    const masked = value.replace(/:\/\/[^@]+@/, '://***:***@');
    console.log(`${value ? '✅' : '❌'} ${v}: ${masked}`);
  } else if (v === 'GEMINI_API_KEY' && value) {
    console.log(`✅ ${v}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`${value ? '✅' : '❌'} ${v}: ${value || 'NON DÉFINI'}`);
  }
});

if (!process.env.DATABASE_URL) {
  console.log('\n❌ DATABASE_URL manquant - l\'ingestion échouera');
  console.log('   Exemple: export DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
} else if (process.env.DATABASE_URL.includes('base')) {
  console.log('\n⚠️  DATABASE_URL contient "base" - vérifiez que le nom d\'hôte est correct');
  console.log('   Erreur probable: getaddrinfo ENOTFOUND base');
}

console.log('\n✨ Vérification terminée');

if (existingSources.length === 0) {
  console.log('\n❌ Aucune source disponible pour l\'ingestion');
  process.exit(1);
} else {
  console.log(`\n✅ ${existingSources.length} source(s) prête(s) pour l\'ingestion`);
}