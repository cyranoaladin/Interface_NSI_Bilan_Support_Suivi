#!/usr/bin/env bash

# ========================================================
# Script de test des modèles Gemini (Google Generative AI)
# ========================================================

# Vérifier si la clé est définie
if [[ -z "$GEMINI_API_KEY" ]]; then
  echo "❌ Erreur : la variable GEMINI_API_KEY n'est pas définie."
  echo "👉 Exécute d'abord : export GEMINI_API_KEY=ta_cle"
  exit 1
fi

BASE_URL="https://generativelanguage.googleapis.com/v1beta/models"

echo "✅ Clé API détectée. Test des modèles Gemini..."
echo

# Fonction utilitaire pour extraire le texte de la réponse JSON
extract_text() {
  jq -r '.candidates[0].content.parts[0].text // "⚠️ Pas de texte généré"' <<< "$1"
}

# -------- Test Gemini Flash --------
echo "🔹 Test modèle gemini-1.5-flash"
resp=$(curl -s -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Bonjour Gemini, peux-tu te présenter ?"}]}]}' \
  "$BASE_URL/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY")
extract_text "$resp"
echo

# -------- Test Gemini Pro --------
echo "🔹 Test modèle gemini-1.5-pro"
resp=$(curl -s -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Explique la différence entre Python et JavaScript"}]}]}' \
  "$BASE_URL/gemini-1.5-pro:generateContent?key=$GEMINI_API_KEY")
extract_text "$resp"
echo

# -------- Test Embeddings --------
echo "🔹 Test modèle text-embedding-004"
resp=$(curl -s -H "Content-Type: application/json" \
  -d '{
        "model": "models/text-embedding-004",
        "content": {
          "parts": [{"text": "Les algorithmes de tri en informatique"}]
        }
      }' \
  "$BASE_URL/text-embedding-004:embedContent?key=$GEMINI_API_KEY")

echo "Taille du vecteur : $(jq '.embedding.values | length' <<< "$resp")"
echo "Premiers éléments : $(jq -r '.embedding.values[:5] | join(", ")' <<< "$resp") ..."
echo

echo "✅ Tests terminés."
