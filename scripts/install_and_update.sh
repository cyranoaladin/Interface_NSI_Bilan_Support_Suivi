#!/usr/bin/env bash
set -e

BASE_DIR="/home/alaeddine/Interface_NSI_2025_2026_local"
RES_DIR="$BASE_DIR/resources"

echo "📂 Création du dossier resources..."
mkdir -p "$RES_DIR"

echo "📥 Copie des fichiers depuis data/rag_sources/ vers resources/..."
cp -u "$BASE_DIR/data/rag_sources/"* "$RES_DIR/"

echo "🔄 Mise à jour de rag_mapping.json..."
node "$BASE_DIR/scripts/update_rag_mapping.js"

echo "✅ Installation terminée : tous les fichiers sont dans /resources et rag_mapping.json est à jour."
