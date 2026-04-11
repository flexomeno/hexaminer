# Backend API (AWS Lambda)

Código TypeScript de las funciones serverless: análisis con OpenAI (visión), lectura/escritura en **DynamoDB** (single-table), **S3** (presign), cola **SQS** para análisis asíncronos y utilidades de operación (regrade por lotes).

## Requisitos

- **Node.js 20** (alineado con el runtime Lambda en Terraform)
- `npm install` en este directorio

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compila TypeScript a `dist/` (desarrollo local). |
| `npm run build:terraform` | Genera bundles ZIP bajo `terraform/.build/` para `terraform apply` (ver `scripts/bundle-lambda-terraform.mjs`). |

Tras cambiar handlers, `openai.ts`, `dynamo.ts`, etc.: `npm run build:terraform` y luego `terraform apply` en `../terraform`.

## Estructura

```text
src/handlers/     # Punto de entrada por Lambda (exports handler)
src/lib/          # openai.ts, dynamo.ts, s3.ts, config, merge, …
src/types/        # Tipos de dominio compartidos
scripts/          # bundle-lambda-terraform.mjs + herramientas Python (operación)
serverless.yml    # Despliegue alternativo con Serverless Framework
```

## Lambdas y rutas HTTP

Definidas en `terraform/locals.tf` (deben coincidir con las carpetas que empaqueta `bundle-lambda-terraform.mjs`).

| Función | Ruta HTTP | Notas |
|---------|-----------|--------|
| `analyzeProduct` | `POST /analyze-product` | Visión + caché; puede usar flujo síncrono. |
| `startAnalyzeJob` | `POST /analyze-product/start` | Encola trabajo en SQS. |
| `getAnalyzeJob` | `GET /analyze-product/job` | Consulta estado del job. |
| `getUploadUrl` | `POST /upload-url` | URL prefirmada para subir imagen a S3. |
| `getProduct` | `GET /product` | Producto por uid. |
| `getUserDashboard` | `GET /dashboard` | Historial / resumen. |
| `addShoppingListItem` | `POST /shopping-list/items` | |
| `evaluateShoppingList` | `POST /shopping-list/evaluate` | |
| `resetUserSession` | `POST /shopping-list/reset` | |
| `processAnalysisJob` | *(ninguna)* | Disparada por **SQS** (worker). |
| `regradeProducts` | *(ninguna)* | Solo **`aws lambda invoke`** (re-análisis masivo por texto; no exponer en HTTP). |

Timeouts y memoria concretos están en `locals.tf`.

## Regrade de productos (`regradeProducts`)

Sirve para **volver a ejecutar el análisis** con el **prompt actual** usando solo datos ya guardados (JSON previo / perfil), sin imágenes. Escribe en el **mismo** ítem `PRODUCT#<uid>` / `SK = PROFILE` vía `putProductAnalysis` (no duplica filas).

**Nombre de la función:** `{project_name}-{stage}-regradeProducts` (por defecto Terraform: `product-analysis-api-dev-regradeProducts`).

**Payload** (JSON en invoke directo):

| Campo | Descripción |
|-------|-------------|
| `dryRun` | `true`: no escribe en Dynamo. |
| `maxProducts` | Cuántos productos procesar **por invocación** (default 5, máx. 25). |
| `onlyUid` | Si se indica, solo ese uid (ignora scan y `resume`). |
| `scanSegmentLimit` | Tamaño de segmento del Scan Dynamo (default 100). |
| `delayMs` | Pausa entre productos (rate limit OpenAI); default desde env `REGRADE_DELAY_MS` en Lambda. |
| `resume` | `{ "exclusiveStartKey": {...}, "skipInPage": n }` para continuar tras un corte o límite. |

Para **toda la tabla**, encadena invocaciones con `resume` hasta que la respuesta tenga `"finishedTable": true`, o usa el script Python (abajo).

**Cliente AWS:** las invocaciones largas superan el timeout de lectura por defecto del CLI (~60 s). Usa `--cli-read-timeout 0` con `aws lambda invoke`, o el script con boto3.

## Herramientas Python (`scripts/`)

Requieren **boto3**. En macOS/Homebrew conviene un **venv** (PEP 668 impide `pip3 install` global):

```bash
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements-tools.txt
```

| Script | Uso |
|--------|-----|
| `scripts/regrade_products_loop.py` | Invoca `regradeProducts` en tandas (`--batch-size` 1–25) hasta `finishedTable`. Flags: `--function-name`, `--region`, `--profile`, `--dry-run`, `--read-timeout`. |
| `scripts/find_product_by_name.py` | Busca perfiles `PRODUCT#*` / `PROFILE` por subcadena en **name, brand o uid** (Scan paginado). Flags: `--table-name` / env `TABLE_NAME`, `--sample N` (diagnóstico), `--in any|name|brand|barcode`, `--exact`, `--json`. |

Variable de entorno útil: `TABLE_NAME` (mismo nombre que output Terraform `dynamodb_table_name`).

## Variables de entorno en Lambda

Inyectadas por Terraform (ver `terraform/lambda.tf`): entre otras, `TABLE_NAME`, `BUCKET_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANALYZE_JOBS_QUEUE_URL` (donde aplique), `REGRADE_DELAY_MS` (solo `regradeProducts`).

## Serverless Framework

`serverless.yml` define las mismas funciones de forma equivalente (incluida **`regradeProducts`**). La invocación de regrade sigue siendo **directa** (`serverless invoke` / consola AWS), no HTTP público. CORS de S3 puede requerir configuración manual si no usas Terraform.

## Documentación relacionada

- [`../terraform/README.md`](../terraform/README.md) — despliegue, outputs, archivos `.tf`.
- [`../docs/architecture.md`](../docs/architecture.md) — modelo DynamoDB, flujos, endpoints resumidos.
- [`../README.md`](../README.md) — visión general del monorepo.
