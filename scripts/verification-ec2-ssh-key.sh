#!/usr/bin/env bash
# Imprime la ruta absoluta de la clave privada generada por Terraform (output verification_ec2_private_key_path).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
P="$(terraform -chdir="$ROOT/terraform" output -raw verification_ec2_private_key_path 2>/dev/null || true)"
if [[ -z "${P:-}" || "$P" == "null" ]]; then
  echo "No hay clave generada (verify_ec2_generate_ssh_key=false o EC2 desactivada)." >&2
  exit 1
fi
echo "$P"
