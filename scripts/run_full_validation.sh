#!/bin/bash
set -e

echo "🚀 Lancement de la validation complète Premium..."

# Étape 1 - Vérification du mapping
echo "📂 Étape 1: Vérification du mapping RAG et des ressources..."
node scripts/check_mapping.js --json
echo "🔎 Étape 1 terminée avec code 0"

# Étape 2 - Vérification des ressources
echo "📂 Étape 2: verify_resources.js..."
node scripts/verify_resources.js --json || { echo "❌ Échec étape 2"; exit 1; }
echo "🔎 Étape 2 terminée avec code 0"

# Étape 3 - Tests unitaires et intégration
echo "🧪 Étape 3: Tests unitaires et intégration..."
npm run test:int --workspace=nsi-web || { echo "❌ Échec étape 3"; exit 1; }
echo "🔎 Étape 3 terminée avec code 0"

# Étape 4 - Batch réel
echo "📊 Étape 4: Batch audit Premium..."
# Vérifier serveur Next (port 3000) – si absent, afficher une aide claire
if ! curl -fsS http://localhost:3000 >/dev/null; then
  echo "⚠️ Serveur Next (http://localhost:3000) indisponible."
  echo "   Démarrez soit: 'docker compose -f infra/docker-compose.yml up -d web worker', soit 'npm -w nsi-web run dev' dans un autre terminal."
  exit 1
fi
npx ts-node -P tsconfig.scripts.json scripts/run_batch_real_bilans.ts || { echo "❌ Échec étape 4"; exit 1; }
echo "🔎 Étape 4 terminée avec code 0"

# Étape 5 - Audit PDF
echo "📑 Étape 5: Vérification des PDFs générés..."
npx ts-node -P tsconfig.scripts.json scripts/validate_pdf_bilan.ts || { echo "❌ Échec étape 5"; exit 1; }
echo "🔎 Étape 5 terminée avec code 0"

echo "✅ Validation complète terminée."
