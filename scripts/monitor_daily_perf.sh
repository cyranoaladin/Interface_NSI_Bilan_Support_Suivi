#!/usr/bin/env bash
set -euo pipefail

# Configuration
BASE_URL=${BASE_URL:-http://localhost:3000}
REPO=/home/alaeddine/Interface_NSI_2025_2026_local
REPORT_DIR="$REPO/docs/perf_reports"

# Timeouts et runs (1 run quotidien)
export PDF_TIMEOUT_ELEVE=${PDF_TIMEOUT_ELEVE:-300}
export PDF_TIMEOUT_ENSEIGNANT=${PDF_TIMEOUT_ENSEIGNANT:-300}
export PERF_RUNS=1
export PDF_PARALLEL=${PDF_PARALLEL:-1}
export LLM_MAX_CONCURRENCY=${LLM_MAX_CONCURRENCY:-3}
export LLM_GEMINI_ATTEMPTS=${LLM_GEMINI_ATTEMPTS:-1}
export LLM_OPENAI_ATTEMPTS=${LLM_OPENAI_ATTEMPTS:-1}

# Lancer le perf test (1 run)
npm -C "$REPO" run -s perf:test

# Récupérer le dernier rapport JSON
LATEST_JSON=$(ls -1t "$REPORT_DIR"/report_*.json | head -n 1)
if [ -z "${LATEST_JSON:-}" ] || [ ! -f "$LATEST_JSON" ]; then
  echo "[monitor] ERROR: aucun rapport JSON trouvé" >&2
  exit 2
fi

# Calculs
SUCCESS_RATE=$(jq '[.runs[].success] as $s | ( ($s|map(select(.==true))|length)*100/($s|length) )' "$LATEST_JSON")
PDF_OK=$(jq '[.runs[] | ( ( ( .pdf_eleve_dispo == true ) and ( .pdf_enseignant_dispo == true ) ) )] | map(select(.==true)) | length' "$LATEST_JSON")
PDF_ALL=$(jq '.runs | length' "$LATEST_JSON")
if [ "$PDF_ALL" -gt 0 ]; then
  PDF_AVAIL_PCT=$(awk -v ok="$PDF_OK" -v all="$PDF_ALL" 'BEGIN{printf("%.1f", (ok*100.0)/all)}')
else
  PDF_AVAIL_PCT=0.0
fi

TOTALS=$(jq -r '[.runs[].total_time_s] | @csv' "$LATEST_JSON")
SIZES_E=$(jq -r '[.runs[].size_eleve_kb] | @csv' "$LATEST_JSON")
SIZES_T=$(jq -r '[.runs[].size_enseignant_kb] | @csv' "$LATEST_JSON")

# Rapport Markdown minimal
TS=$(date +%Y-%m-%dT%H:%M:%S)
OUT_MD="$REPORT_DIR/monitor_${TS}.md"
{
  echo "# Daily Perf Monitor — $TS"
  echo
  echo "- Success rate: ${SUCCESS_RATE}%"
  echo "- PDF availability: ${PDF_AVAIL_PCT}%"
  echo "- Total times (s): ${TOTALS}"
  echo "- Sizes Élève (KB): ${SIZES_E}"
  echo "- Sizes Enseignant (KB): ${SIZES_T}"
  echo
  echo "Source JSON: ${LATEST_JSON}"
} > "$OUT_MD"

# Afficher sortie courte
cat "$OUT_MD"

# Règle d’alerte: échec si succès < 100% ou disponibilité PDF < 100%
FAIL=0
awk -v s="$SUCCESS_RATE" 'BEGIN{ if (s+0 < 100.0) exit 1; else exit 0 }' || FAIL=1
awk -v p="$PDF_AVAIL_PCT" 'BEGIN{ if (p+0 < 100.0) exit 1; else exit 0 }' || FAIL=1

exit $FAIL
