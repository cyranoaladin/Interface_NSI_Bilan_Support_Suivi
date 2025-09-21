#!/usr/bin/env node
/**
 * Vérifie la cohérence entre config/rag_mapping.json et /resources
 * - ✅ fichiers trouvés
 * - ❌ fichiers manquants
 *
 * Codes de sortie :
 *   0 = OK
 *   2 = fichiers manquants
 *   1 = erreur inattendue
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const JSON_MODE = args.includes("--json");

const projectRoot = path.resolve(__dirname, "..");
const mappingPath = path.join(projectRoot, "config", "rag_mapping.json");
const resourcesDir = path.join(projectRoot, "resources");

const checked = [];
const missing = [];
let hadUnexpectedError = false;

function normalizeEntry(p) {
  if (typeof p !== "string") return null;
  if (p.startsWith("resources/")) return p.slice("resources/".length);
  if (p.startsWith("/resources/")) return p.slice("/resources/".length);
  return p;
}

function checkSection(sectionName, filesOrObj) {
  if (Array.isArray(filesOrObj)) {
    if (!JSON_MODE) console.log(`🔎 Section: ${sectionName}`);
    for (const raw of filesOrObj) {
      const f = normalizeEntry(raw);
      if (!f) { hadUnexpectedError = true; continue; }
      const absPath = path.join(resourcesDir, f);
      const exists = fs.existsSync(absPath);
      checked.push({ section: sectionName, file: f, exists });
      if (!JSON_MODE) {
        if (exists) console.log(`   ✅ ${f}`);
        else console.log(`   ❌ ${f} (manquant)`);
      }
      if (!exists) missing.push({ section: sectionName, file: f });
    }
  } else if (filesOrObj && typeof filesOrObj === "object") {
    for (const [sub, subFiles] of Object.entries(filesOrObj)) {
      checkSection(`${sectionName}:${sub}`, subFiles);
    }
  } else {
    if (!JSON_MODE) console.warn(`⚠️ Section ${sectionName} a un format inattendu`);
    hadUnexpectedError = true;
  }
}

(async () => {
  try {
    if (!fs.existsSync(mappingPath)) {
      const msg = `❌ Fichier de mapping introuvable: ${mappingPath}`;
      if (!JSON_MODE) console.error(msg);
      hadUnexpectedError = true;
    }
    if (!fs.existsSync(resourcesDir)) {
      const msg = `❌ Dossier resources introuvable: ${resourcesDir}`;
      if (!JSON_MODE) console.error(msg);
      hadUnexpectedError = true;
    }

    let mapping = {};
    if (!hadUnexpectedError) {
      mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
      if (!JSON_MODE) {
        console.log(`📂 Vérification des fichiers depuis ${mappingPath}`);
        console.log(`📁 Resources: ${resourcesDir}\n`);
      }

      for (const [section, filesOrObj] of Object.entries(mapping)) {
        checkSection(section, filesOrObj);
      }
    }

    const ok = missing.length === 0 && !hadUnexpectedError;
    const exitCode = hadUnexpectedError ? 1 : missing.length > 0 ? 2 : 0;

    if (JSON_MODE) {
      const payload = { ok, missing, checked };
      console.log(JSON.stringify(payload, null, 2));
      process.exit(exitCode);
    }

    console.log("\n📊 Résumé final :");
    if (ok) {
      console.log("✅ Tous les fichiers référencés existent.");
    } else if (hadUnexpectedError) {
      console.log("❌ Erreur inattendue pendant la vérification (voir logs ci-dessus).");
    } else {
      console.log(`⚠️  ${missing.length} fichier(s) manquant(s):`);
      for (const m of missing) {
        console.log(`   ❌ ${m.section} → ${m.file}`);
      }
    }
    process.exit(exitCode);
  } catch (err) {
    if (!JSON_MODE) console.error("💥 Erreur inattendue :", err);
    else console.log(JSON.stringify({ ok: false, error: String(err) }, null, 2));
    process.exit(1);
  }
})();
