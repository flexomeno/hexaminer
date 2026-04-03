#!/usr/bin/env bash
# Sube una imagen local al API Hexaminer y ejecuta el análisis (upload-url → S3 → analyze-product).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TERRAFORM_DIR="$REPO_ROOT/terraform"

usage() {
  cat <<'EOF'
Uso: analyze-label.sh [opciones] <ruta/imagen.jpg|png|webp>

  Sube la foto al bucket S3 del proyecto y llama POST /analyze-product.
  La URL del API se toma de (en orden): -b, HEXAMINER_API_BASE_URL, terraform output.

Opciones:
  -b URL     Base del API Gateway (sin barra final)
  -u ID      userId para DynamoDB (ej. email#tu@correo.com)
  -s         Tras analizar, POST /shopping-list/items con el uid del producto
  -q         Resumen en una línea (uid, score, nombre)
  -h         Esta ayuda

Entorno:
  HEXAMINER_API_BASE_URL   URL del API si no hay terraform state
  HEXAMINER_USER_ID        Mismo efecto que -u

Ejemplos:
  ./scripts/analyze-label.sh ~/Desktop/etiqueta.jpg
  ./scripts/analyze-label.sh -u 'email#yo@gmail.com' -s foto.png
EOF
}

API_BASE="${HEXAMINER_API_BASE_URL:-}"
USER_ID="${HEXAMINER_USER_ID:-}"
SHOPPING=0
QUIET=0

while getopts "b:u:sqh" opt; do
  case "$opt" in
    b) API_BASE="$OPTARG" ;;
    u) USER_ID="$OPTARG" ;;
    s) SHOPPING=1 ;;
    q) QUIET=1 ;;
    h) usage; exit 0 ;;
    *) usage >&2; exit 1 ;;
  esac
done
shift $((OPTIND - 1))

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

IMG=$1
if [[ ! -f "$IMG" ]]; then
  echo "No existe el archivo: $IMG" >&2
  exit 1
fi

ext="${IMG##*.}"
ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
case "$ext_lower" in
  jpg | jpeg) CT="image/jpeg" ;;
  png)        CT="image/png" ;;
  webp)       CT="image/webp" ;;
  *)
    echo "Extensión no soportada: .$ext — usa .jpg, .jpeg, .png o .webp" >&2
    exit 1
    ;;
esac

if [[ -z "$API_BASE" && -d "$TERRAFORM_DIR" ]]; then
  API_BASE=$(cd "$TERRAFORM_DIR" && terraform output -raw api_base_url 2>/dev/null) || API_BASE=""
fi

if [[ -z "$API_BASE" ]]; then
  echo "No pude obtener la URL del API. Usa -b, export HEXAMINER_API_BASE_URL=... o terraform en $TERRAFORM_DIR" >&2
  exit 1
fi

API_BASE="${API_BASE%/}"
NAME=$(basename "$IMG")
SAFE_NAME=$(echo "$NAME" | tr -cd '[:alnum:]._-')
[[ -n "$SAFE_NAME" ]] || SAFE_NAME="upload.jpg"

if [[ "$QUIET" -eq 0 ]]; then
  echo "API:    $API_BASE" >&2
  echo "Imagen: $IMG ($CT)" >&2
  [[ -n "$USER_ID" ]] && echo "Usuario: $USER_ID" >&2
fi

# --- POST /upload-url ---
UP_JSON=$(curl -sS -X POST "$API_BASE/upload-url" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"$SAFE_NAME\",\"contentType\":\"$CT\"}")

if ! echo "$UP_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "Respuesta inválida de upload-url:" >&2
  echo "$UP_JSON" >&2
  exit 1
fi

if ! echo "$UP_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('uploadUrl') else 1)" 2>/dev/null; then
  echo "Error en upload-url:" >&2
  echo "$UP_JSON" | python3 -m json.tool 2>/dev/null || echo "$UP_JSON" >&2
  exit 1
fi

KEY=$(echo "$UP_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")
UPLOAD_URL=$(echo "$UP_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['uploadUrl'])")

# --- PUT S3 ---
PUT_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
  -H "Content-Type: $CT" \
  --data-binary @"$IMG")

if [[ "$PUT_CODE" != "200" ]]; then
  echo "Fallo al subir a S3 (HTTP $PUT_CODE)" >&2
  exit 1
fi
[[ "$QUIET" -eq 0 ]] && echo "S3:     subida OK (key=$KEY)" >&2

# --- POST /analyze-product (una sola petición) ---
AN_BODY=$(python3 -c "import json,sys; k=sys.argv[1]; u=sys.argv[2]; d={'imageKey':k};
u=u.strip();
if u: d['userId']=u
print(json.dumps(d))" "$KEY" "${USER_ID:-}")

AN_CODE=$(curl -sS -o /tmp/hexaminer-an.json -w "%{http_code}" -X POST "$API_BASE/analyze-product" \
  -H "Content-Type: application/json" \
  -d "$AN_BODY")

if [[ "$AN_CODE" != "200" ]]; then
  echo "analyze-product HTTP $AN_CODE" >&2
  cat /tmp/hexaminer-an.json >&2
  exit 1
fi

PRODUCT_UID=$(python3 -c "import json; print(json.load(open('/tmp/hexaminer-an.json'))['product']['uid'])")
SOURCE=$(python3 -c "import json; print(json.load(open('/tmp/hexaminer-an.json'))['source'])")
SCORE=$(python3 -c "import json; print(json.load(open('/tmp/hexaminer-an.json'))['product']['score'])")
PNAME=$(python3 -c "import json; print(json.load(open('/tmp/hexaminer-an.json'))['product'].get('name',''))")

if [[ "$QUIET" -eq 1 ]]; then
  echo "uid=$PRODUCT_UID score=$SCORE source=$SOURCE name=$PNAME"
else
  python3 -m json.tool < /tmp/hexaminer-an.json
fi

# --- Opcional: lista de compras ---
if [[ "$SHOPPING" -eq 1 ]]; then
  SL_BODY=$(python3 -c "import json,sys; user=sys.argv[1]; puid=sys.argv[2]; d={'uid':puid};
if user.strip(): d['userId']=user.strip()
print(json.dumps(d))" "${USER_ID:-}" "$PRODUCT_UID")
  SL_JSON=$(curl -sS -X POST "$API_BASE/shopping-list/items" \
    -H "Content-Type: application/json" \
    -d "$SL_BODY")
  if [[ "$QUIET" -eq 0 ]]; then
    echo "--- shopping-list/items ---" >&2
    echo "$SL_JSON" | python3 -m json.tool
  fi
fi
