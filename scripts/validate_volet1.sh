#!/usr/bin/env bash
set -euo pipefail
FILE="data/questionnaire_nsi_terminale.final.json"

# 1) JSON valide
jq empty "$FILE"

# 2) Nombre de questions Volet 1 = 20
count=$(jq '.workflow.stages[] | select(.id=="volet_connaissances") | .items | length' "$FILE")
if [ "$count" -ne 20 ]; then
  echo "[FAIL] items length=$count (expected 20)" >&2
  exit 1
fi

# 3) Domaines autorisés
allowed='["structures","lecture_algo","donnees","logique","web","python"]'
domains=$(jq -r '.workflow.stages[] | select(.id=="volet_connaissances") | .items[].domain' "$FILE" | sort -u)
for d in $domains; do
  if ! jq -en --argjson allowed "$allowed" --arg d "$d" '$allowed | index($d)'
  then
    echo "[FAIL] domain '$d' not allowed" >&2
    exit 1
  fi
done

# 4) Somme des poids domaine = 1 et égalité scoring/workflow
sum=$(jq '[.workflow.stages[] | select(.id=="volet_connaissances") | .domain_weights[]] | add' "$FILE")
if [ "$sum" != "1" ] && [ "$sum" != "1.0" ]; then
  echo "[FAIL] domain_weights sum=$sum (expected 1.0)" >&2
  exit 1
fi
same=$(jq '(.workflow.stages[] | select(.id=="volet_connaissances") | .domain_weights) == (.scoring.sections.volet_connaissances.weights)' "$FILE")
if [ "$same" != "true" ]; then
  echo "[FAIL] scoring.weights != workflow.domain_weights" >&2
  exit 1
fi

echo "[OK] Validation questionnaire_nsi_terminale.final.json passed"
