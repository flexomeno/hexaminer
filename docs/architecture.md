# Arquitectura Serverless - Product Analyzer

## Estructura de carpetas

```text
apps/web                      # Frontend Next.js (App Router)
  app/
    api/auth/[...nextauth]
    camera
    dashboard
  components/
  lib/
  types/

services/api                  # Código de Lambdas (TypeScript)
  src/handlers
  src/lib                     # openai.ts (prompt), dynamo.ts, s3.ts, …
  src/types
  serverless.yml              # Despliegue alternativo con Serverless Framework

terraform/                    # Infraestructura como código (recomendado en este repo)
  *.tf                        # Ver terraform/README.md para lista de archivos
```

## Infraestructura AWS

Hay **dos formas** de desplegar lo mismo conceptualmente:

### A) Terraform (recomendado)

Directorio `terraform/`: define API Gateway HTTP, Lambdas, DynamoDB, S3, IAM, CORS en S3 para subidas desde el navegador. Lista detallada de archivos en **`terraform/README.md`**.

- **API Gateway HTTP API** con CORS abierto para el API.
- **Lambdas** (mismas rutas que abajo).
- **DynamoDB**: una tabla (`PK`, `SK`) + GSI1.
- **S3**: bucket privado, cifrado, política TLS, **CORS** para `PUT` desde orígenes del front (p. ej. `localhost:3000`).
- **IAM**: rol de Lambda con logs, DynamoDB y S3 del bucket.

### B) Serverless Framework

Archivo principal: `services/api/serverless.yml` — mismos recursos lógicos; **no** incluye la configuración CORS de S3 del repo Terraform (si usas solo Serverless, puede hacer falta configurar CORS del bucket manualmente para la subida desde el navegador).

### Endpoints HTTP

- `analyzeProduct` → `POST /analyze-product`
- `getUploadUrl` → `POST /upload-url`
- `addShoppingListItem` → `POST /shopping-list/items`
- `evaluateShoppingList` → `POST /shopping-list/evaluate`
- `getUserDashboard` → `GET /dashboard`

## Prompt de OpenAI

Definido en **`services/api/src/lib/openai.ts`** (`SYSTEM_PROMPT` y mensajes de usuario). Tras cambiarlo, hay que **volver a desplegar** las Lambdas (p. ej. `npm run build:terraform` + `terraform apply` en `terraform/`).

## DynamoDB Single Table Design

### Claves base

- `PK` (partition key)
- `SK` (sort key)
- `GSI1PK`, `GSI1SK` para accesos alternos.

### Entidades

1. **Producto**
   - `PK = PRODUCT#{uid}`
   - `SK = PROFILE`
   - `GSI1PK = BARCODE#{uid}`
   - `GSI1SK = PRODUCT`
   - Campos: `id, uid, barcode, name, ingredients, score, disruptors_summary, labor_ethics, last_updated, ...`

2. **Usuario perfil**
   - `PK = USER#{userId}`
   - `SK = PROFILE`
   - `GSI1PK = USER#{userId}`
   - `GSI1SK = PROFILE`
   - Campos: `email, name, image, created_at, updated_at, total_scans`.

3. **Historial de escaneos**
   - `PK = USER#{userId}`
   - `SK = SCAN#{timestamp}#{uid}`
   - `GSI1PK = USER#{userId}`
   - `GSI1SK = SCAN#{timestamp}#{uid}`

4. **Shopping list item**
   - `PK = USER#{userId}`
   - `SK = SHOPPING#{uid}`
   - `GSI1PK = PRODUCT#{uid}`
   - `GSI1SK = USER#{userId}`

## Flujo cache-first (`analyzeProduct`)

1. Frontend sube imagen a S3 usando URL prefirmada (`/upload-url`).
2. Frontend llama `/analyze-product` con `imageKey`.
3. Lambda:
   - descarga imagen de S3,
   - extrae UID (barcode ZXing, fallback OCR-lite/hash + fallback por nombre de archivo),
   - busca en DynamoDB por `PRODUCT#{uid}`.
4. Si existe:
   - retorna producto cacheado (`source = "cache"`),
   - registra scan en historial del usuario.
5. Si no existe:
   - llama OpenAI (`gpt-4o`) con prompt experto y salida JSON estricta,
   - guarda en tabla Products,
   - actualiza historial del usuario,
   - retorna resultado (`source = "openai"`).

## Shopping List Evaluator

`POST /shopping-list/evaluate`

- Calcula:
  - `listSize`
  - `averageScore`
  - `riskProductCount`
  - `riskPercentage`
  - `basketGrade` (`CANASTA_SALUDABLE|MIXTA|CRITICA`)
  - `tooManyEndocrineRisk` (umbral >= 40%)
- Devuelve recomendación accionable.

## Frontend UX (Next.js)

- **Android:** carpeta `android/`: app nativa (Jetpack Compose) que consume el mismo HTTP API. Ver `android/README.md`.

- `/camera`: captura/subida de foto, análisis, render del resultado.
- `/dashboard`: historial + resumen de canasta.
- Componente `ScoreRing` (estilo Shadcn custom):
  - `0-7`: rojo
  - `8-14`: amarillo
  - `15-20`: verde

## Variables de entorno clave

### Backend (Lambda en ejecución)

Inyectadas por Terraform/Serverless en la Lambda:

- `TABLE_NAME`
- `BUCKET_NAME`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o`)

### Despliegue Terraform (solo en tu máquina / CI)

- `TF_VAR_openaikey` → variable Terraform `openaikey` → se mapea a `OPENAI_API_KEY` en las Lambdas

### Frontend (`apps/web`)

- `NEXT_PUBLIC_API_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

## Nota de seguridad IAM/S3

El bucket permanece privado. Solo la Lambda con su rol IAM tiene permisos de `GetObject`/`PutObject` sobre `arn:aws:s3:::<bucket>/*`.
