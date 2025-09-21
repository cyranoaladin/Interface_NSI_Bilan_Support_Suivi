#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const BASE_DIR = "/home/alaeddine/Interface_NSI_2025_2026_local";
const RES_DIR = path.join(BASE_DIR, "resources");
const MAPPING_FILE = path.join(BASE_DIR, "config", "rag_mapping.json");

// CLI flags
const args = process.argv.slice(2);
const JSON_MODE = args.includes("--json");

// ✅ Liste des fichiers attendus dans /resources
const EXPECTED_FILES = [
  "questionnaire_nsi_terminale.final.json",
  "Ressources_NSI_pour_Eleves.md",
  "GUIDE_PEDAGOGIQUE_NSI_PMF.md",
  "IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md",
  "BILAN_PREMIUM_REQUIREMENTS.md",
  "vademecum-snt-nsi.pdf",
  "programme_nsi_terminale.pdf",
  "programme_nsi_premiere.pdf",
  "RCP_Referentiel_Competences.pdf",
  "Questionnaire_Rentree.pdf",
];

// Helper
function checkFile(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Collectors for JSON mode
const checked = [];
const missing = [];
let hadUnexpectedError = false;

function normalizeEntry(p) {
  if (typeof p !== "string") return null;
  if (p.startsWith("resources/")) return p.slice("resources/".length);
  if (p.startsWith("/resources/")) return p.slice("/resources/".length);
  return p;
}

function walkMapping(node, prefix = "") {
  if (Array.isArray(node)) {
    for (const raw of node) {
      const file = normalizeEntry(raw);
      if (!file) { hadUnexpectedError = true; continue; }
      const exists = checkFile(path.join(RES_DIR, file));
      checked.push({ section: prefix || "root", file, exists });
      if (!JSON_MODE) {
        if (exists) console.log(`   ✅ ${file}`);
        else console.log(`   ❌ ${file} (introuvable)`);
      }
      if (!exists) missing.push({ section: prefix || "root", file });
    }
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (!JSON_MODE && prefix === "") console.log(`🔎 Section: ${k}`);
      walkMapping(v, prefix ? `${prefix}:${k}` : k);
    }
  } else {
    hadUnexpectedError = true;
    if (!JSON_MODE) console.error(`⚠️ Format inattendu sous section '${prefix}'`);
  }
}

// Vérification des fichiers attendus
if (!JSON_MODE) console.log("📂 Vérification des fichiers attendus dans /resources...\n");
let allGood = true;
for (const file of EXPECTED_FILES) {
  const fullPath = path.join(RES_DIR, file);
  const exists = checkFile(fullPath);
  checked.push({ section: "resources:expected", file, exists });
  if (!JSON_MODE) {
    if (exists) console.log(`✅ ${file}`);
    else console.log(`❌ ${file} (manquant)`);
  }
  if (!exists) {
    allGood = false;
    missing.push({ section: "resources:expected", file });
  }
}

// Vérification des chemins définis dans rag_mapping.json
if (!JSON_MODE) console.log("\n📖 Vérification des chemins dans rag_mapping.json...\n");
try {
  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf-8"));
  walkMapping(mapping);
} catch (err) {
  if (!JSON_MODE) console.error("❌ Impossible de lire rag_mapping.json :", err.message);
  hadUnexpectedError = true;
}

const ok = allGood && missing.length === 0 && !hadUnexpectedError;
const exitCode = hadUnexpectedError ? 1 : missing.length > 0 ? 2 : 0;

if (JSON_MODE) {
  const payload = { ok, missing, checked };
  try {
    console.log(JSON.stringify(payload, null, 2));
  } catch (e) {
    // JSON serialization should not fail; fallback minimal
    console.log('{"ok":false,"missing":[{"section":"internal","file":"serialization"}],"checked":[]}');
  }
  process.exit(exitCode);
}

console.log("\n📊 Rapport final :");
if (ok) {
  console.log("🎉 Tout est en ordre : fichiers et mapping sont corrects !");
} else if (hadUnexpectedError) {
  console.log("❌ Erreur inattendue pendant la vérification (voir logs ci-dessus).");
} else {
  console.log("⚠️ Des erreurs détectées : certains fichiers/mappings sont manquants ou invalides.");
}
process.exit(exitCode);
