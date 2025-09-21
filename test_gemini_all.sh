#!/bin/bash

# ===============================
# Test des modèles Gemini & Embeddings
# ===============================

if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ Variable d'environnement GEMINI_API_KEY non définie."
  echo "👉 Exécute : export GEMINI_API_KEY='ta_cle_api'"
  exit 1
fi

echo "✅ Clé API détectée."
echo "Début des tests...\n"

# ---------- Fonction pour mesurer latence ----------
call_api() {
  local model=$1
  local endpoint=$2
  local data=$3

  echo "🔹 Test modèle $model"

  start=$(date +%s%3N)  # début en millisecondes
  response=$(curl -s -H "Content-Type: application/json" \
    -d "$data" \
    "https://generativelanguage.googleapis.com/v1beta/models/$endpoint?key=$GEMINI_API_KEY")
  end=$(date +%s%3N)
  duration=$((end - start))

  echo "⏱️  Latence : ${duration} ms"

  if [[ "$model" == text-embedding-004 ]]; then
    dim=$(echo "$response" | jq '.embedding.values | length')
    echo "📏 Dimension de l'embedding : $dim"
    echo "🔎 Premiers éléments :"
    echo "$response" | jq '.embedding.values[:10]'
  else
    echo "💬 Réponse :"
    echo "$response" | jq -r '.candidates[0].content.parts[0].text' | head -20
  fi

  echo -e "\n--------------------------------------\n"
}

# ---------- Tests ----------
# gemini-1.5-flash
call_api "gemini-1.5-flash" "gemini-1.5-flash:generateContent" \
'{
  "contents":[{"parts":[{"text":"Bonjour Gemini, donne-moi une phrase simple."}]}]
}'

# gemini-1.5-pro
call_api "gemini-1.5-pro" "gemini-1.5-pro:generateContent" \
'{
  "contents":[{"parts":[{"text":"Explique-moi brièvement la différence entre Python et JavaScript."}]}]
}'

# text-embedding-004
call_api "text-embedding-004" "text-embedding-004:embedContent" \
'{
  "model": "models/text-embedding-004",
  "content": {"parts":[{"text":"Algorithmes de tri"}]}
}'

echo "✅ Tous les tests sont terminés."
