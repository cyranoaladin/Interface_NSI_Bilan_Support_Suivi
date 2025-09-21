#!/usr/bin/env node
/**
 * Script d'installation des ressources RAG
 * Copie les fichiers depuis data/rag_sources vers resources/
 */

const fs = require("fs");
const path = require("path");

const BASE_DIR = "/home/alaeddine/Interface_NSI_2025_2026_local";
const SRC_DIR = path.join(BASE_DIR, "data/rag_sources");
const RES_DIR = path.join(BASE_DIR, "resources");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("📂 Création du dossier :", dir);
  }
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log("✅ Copié :", path.basename(src));
  } else {
    console.warn("⚠️  Fichier manquant :", src);
  }
}

console.log("📥 Copie des fichiers nécessaires depuis", SRC_DIR, "vers", RES_DIR);
ensureDir(RES_DIR);

const files = [
  "BILAN_PREMIUM_REQUIREMENTS.md",
  "Questionnaire_Rentrée.pdf",
  "questionnaire_nsi_terminale.final.json",
  "Ressources NSI pour Élèves.md",
  "GUIDE_PEDAGOGIQUE_NSI_PMF.md",
  "IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md",
  "vademecum-snt-nsi_0.pdf",
  "programme_nsi_premiere.pdf",
  "programme_nsi_terminale.pdf",
  "RCP_Référentiel de compétences en programmation_vue détaillée.pdf",
];

files.forEach((file) => {
  const src = path.join(SRC_DIR, file);
  const dest = path.join(RES_DIR, file);
  copyFile(src, dest);
});

console.log("🎉 Installation terminée. Vérifie avec : ls -lh", RES_DIR);
