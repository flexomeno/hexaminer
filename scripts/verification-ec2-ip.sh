#!/usr/bin/env bash
# Imprime la IP pública de la EC2 de verificación (output Terraform).
# Uso:
#   IP=$(./scripts/verification-ec2-ip.sh)
#   ansible-playbook -i "$IP," -u ec2-user --private-key "$HOME/.ssh/tu.pem" ansible/playbooks/verify-ec2.yml
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IP="$(terraform -chdir="$ROOT/terraform" output -raw verification_ec2_public_ip 2>/dev/null || true)"
if [[ -z "${IP:-}" || "$IP" == "null" ]]; then
  echo "No hay verification_ec2_public_ip. Activa verify_ec2_enabled y terraform apply." >&2
  exit 1
fi
echo "$IP"
