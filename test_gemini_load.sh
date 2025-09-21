#!/bin/bash
set -e

if [[ -z "$GEMINI_API_KEY" ]]; then
  echo "❌ Erreur : la variable d'environnement GEMINI_API_KEY n'est pas définie."
  echo "👉 Exécute : export GEMINI_API_KEY='ta_cle_api'"
  exit 1
fi

echo "✅ Clé API détectée."
echo "🚀 Test de charge concurrent embeddings (5 puis 10 appels)..."
echo

# Test avec N appels en parallèle
run_test() {
  local N=$1
  echo "🔹 Lancement de $N appels en parallèle..."

  results=$(seq 1 $N | xargs -n1 -P$N bash -c '
    start=$(date +%s%3N)
    dim=$(curl -s -H "Content-Type: application/json" \
      -d "{\"model\":\"models/text-embedding-004\",\"content\":{\"parts\":[{\"text\":\"Algorithmes de tri\"}]}}" \
      "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=$GEMINI_API_KEY" \
      | jq -r ".embedding.values | length")
    end=$(date +%s%3N)
    latency=$((end - start))
    echo "$dim $latency"
  ' _)

  echo "$results" | awk '
    {dim_sum+=$1; lat_sum+=$2; count++}
    END {
      if (count>0) {
        print "✅ Réponses:", count
        print "📏 Dimension moyenne:", dim_sum/count
        print "⏱️ Latence moyenne:", lat_sum/count, "ms"
      } else {
        print "❌ Aucune réponse reçue"
      }
    }'
  echo "--------------------------------------"
}

run_test 5
run_test 10

echo "✅ Test de charge terminé."
