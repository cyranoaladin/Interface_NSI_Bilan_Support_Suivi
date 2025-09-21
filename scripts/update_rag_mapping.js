#!/usr/bin/env node
/**
 * Script de mise à jour automatique du rag_mapping.json
 * Pointe les chemins vers /resources/ au lieu de data/rag_sources/
 */

const fs = require("fs");
const path = require("path");

const BASE_DIR = "/home/alaeddine/Interface_NSI_2025_2026_local";
const RES_DIR = path.join(BASE_DIR, "resources");
const CONFIG_DIR = path.join(BASE_DIR, "config");
const RAG_MAPPING = path.join(CONFIG_DIR, "rag_mapping.json");

if (!fs.existsSync(RAG_MAPPING)) {
  console.error("❌ Fichier rag_mapping.json introuvable :", RAG_MAPPING);
  process.exit(1);
}

console.log("📥 Chargement de rag_mapping.json...");
const mapping = JSON.parse(fs.readFileSync(RAG_MAPPING, "utf-8"));

function updatePath(oldPath) {
  const fileName = path.basename(oldPath);
  return path.join(RES_DIR, fileName);
}

// Parcourt toutes les sections et met à jour les chemins
for (const section of Object.keys(mapping)) {
  if (Array.isArray(mapping[section])) {
    mapping[section] = mapping[section].map(updatePath);
  }
}

fs.writeFileSync(RAG_MAPPING, JSON.stringify(mapping, null, 2), "utf-8");
console.log("✅ rag_mapping.json mis à jour avec les chemins vers /resources/");
