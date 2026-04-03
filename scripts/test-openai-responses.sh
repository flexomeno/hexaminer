#!/usr/bin/env bash
set -euo pipefail
# Usa TF_VAR_openaikey (Terraform) o OPENAI_API_KEY (OpenAI / curl estándar)
KEY="${TF_VAR_openaikey:-${OPENAI_API_KEY:-}}"
if [[ -z "$KEY" ]]; then
  echo "Define una de: TF_VAR_openaikey o OPENAI_API_KEY" >&2
  exit 1
fi

MODEL="${1:-gpt-4o}"
echo "POST https://api.openai.com/v1/responses (model=$MODEL)..." >&2

curl -sS https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d "{\"model\":\"${MODEL}\",\"input\":\"Reply with exactly: OK\"}"

echo >&2
