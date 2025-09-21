#!/bin/bash
set -euo pipefail

ROOT="/home/alaeddine/Interface_NSI_2025_2026_local"
RES="$ROOT/resources"
ARCHIVE="$ROOT/data/_legacy_rag_sources_$(date +%Y%m%d_%H%M%S)"

echo "📂 Nettoyage et harmonisation de l'arborescence..."

# 1. Créer archive pour sauvegarder les doublons
mkdir -p "$ARCHIVE"

# 2. Déplacer les anciens dossiers doublons
if [ -d "$ROOT/data/rag_sources" ]; then
  echo "📦 Archivage de data/rag_sources -> $ARCHIVE"
  mv "$ROOT/data/rag_sources" "$ARCHIVE/"
fi
if [ -d "$ROOT/rag_pdfs" ]; then
  echo "📦 Archivage de rag_pdfs -> $ARCHIVE"
  mv "$ROOT/rag_pdfs" "$ARCHIVE/"
fi

# 3. Supprimer les doublons à la racine
for f in BILAN_PREMIUM_REQUIREMENTS.md IA_NSI_Guide_Pedagogique_PMF_RAG_Feed.md; do
  if [ -f "$ROOT/$f" ]; then
    echo "🗑 Suppression doublon racine : $f"
    mv "$ROOT/$f" "$ARCHIVE/"
  fi
done

# 4. Normaliser les fichiers dans resources/
cd "$RES"

if [ -f "Questionnaire_Rentrée.pdf" ]; then
  echo "✏️ Renommage Questionnaire_Rentrée.pdf -> Questionnaire_Rentree.pdf"
  mv "Questionnaire_Rentrée.pdf" "Questionnaire_Rentree.pdf"
fi

if [ -f "RCP_Référentiel de compétences en programmation_vue détaillée.pdf" ]; then
  echo "✏️ Renommage RCP_Référentiel... -> RCP_Referentiel_Competences.pdf"
  mv "RCP_Référentiel de compétences en programmation_vue détaillée.pdf" "RCP_Referentiel_Competences.pdf"
fi

if [ -f "RCP _ Référentiel de compétences en programmation - vue formulaire.pdf" ]; then
  echo "🗑 Suppression doublon RCP formulaire"
  rm "RCP _ Référentiel de compétences en programmation - vue formulaire.pdf"
fi

if [ -f "vademecum-snt-nsi_0.pdf" ]; then
  echo "✏️ Renommage vademecum-snt-nsi_0.pdf -> vademecum-snt-nsi.pdf"
  mv "vademecum-snt-nsi_0.pdf" "vademecum-snt-nsi.pdf"
fi

echo "✅ Arborescence patchée avec succès !"
echo "👉 Appuie sur [Entrée] pour fermer."
read
