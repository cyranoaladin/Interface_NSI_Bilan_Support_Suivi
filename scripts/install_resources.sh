#!/bin/bash
set -e

BASE_DIR="/home/alaeddine/Interface_NSI_2025_2026_local"
SRC_DIR="$BASE_DIR/data/rag_sources"
RES_DIR="$BASE_DIR/resources"

echo "📂 Création du dossier resources..."
mkdir -p "$RES_DIR"

copy_file() {
  local src="$1"
  local dst="$2"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "✅ Copié : $(basename "$src")"
  else
    echo "⚠️  Fichier manquant : $src"
  fi
}

echo "📥 Copie des fichiers nécessaires depuis $SRC_DIR vers $RES_DIR..."

copy_file "$SRC_DIR/BILAN_PREMIUM_REQUIREMENTS.md"              "$RES_DIR/BILAN_PREMIUM_REQUIREMENTS.md"
copy_file "$SRC_DIR/Questionnaire_Rentrée.pdf"                   "$RES_DIR/Questionnaire_Rentrée.pdf"
copy_file "$SRC_DIR/questionnaire_nsi_terminale.final.json"      "$RES_DIR/questionnaire_nsi_terminale.final.json"
copy_file "$SRC_DIR/Ressources NSI pour Élèves.md"               "$RES_DIR/Ressources NSI pour Élèves.md"
copy_file "$SRC_DIR/GUIDE_PEDAGOGIQUE_NSI_PMF.md"                "$RES_DIR/GUIDE_PEDAGOGIQUE_NSI_PMF.md"
copy_file "$SRC_DIR/IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md"    "$RES_DIR/IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md"
copy_file "$SRC_DIR/vademecum-snt-nsi_0.pdf"                     "$RES_DIR/vademecum-snt-nsi_0.pdf"
copy_file "$SRC_DIR/programme_nsi_premiere.pdf"                  "$RES_DIR/programme_nsi_premiere.pdf"
copy_file "$SRC_DIR/programme_nsi_terminale.pdf"                 "$RES_DIR/programme_nsi_terminale.pdf"
copy_file "$SRC_DIR/RCP_Référentiel de compétences en programmation_vue détaillée.pdf" \
          "$RES_DIR/RCP_Référentiel de compétences en programmation_vue détaillée.pdf"

echo "🎉 Installation terminée. Vérifie le contenu avec : ls -lh $RES_DIR"
