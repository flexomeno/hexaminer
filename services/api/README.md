# Backend API (AWS Lambda)

Backend TypeScript ejecutado en Lambda: análisis de imágenes con OpenAI, persistencia en DynamoDB (single-table), presigned upload en S3, pipeline asíncrono con SQS y utilidades operativas.

## Requisitos

- Node.js 20 (mismo runtime que Lambda en Terraform).
- `npm install` en este directorio.

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Alias de `build:terraform`. |
| `npm run build:terraform` | Bundlea cada handler en `terraform/.build/lambda/` (script `scripts/bundle-lambda-terraform.mjs`). |
| `npm run package:serverless` | Ejecuta `serverless package` (flujo alternativo). |

Tras cambios en `src/`, vuelve a ejecutar `npm run build:terraform` y `terraform apply` en `../terraform`.

## Estructura

```text
src/handlers/     Entrypoint por Lambda (export handler)
src/lib/          Config, OpenAI, Dynamo, S3, pipeline, utilidades
src/types/        Tipos de dominio
scripts/          Bundle Terraform + scripts Python de operación
serverless.yml    Alternativa de despliegue con Serverless Framework
```

## Variables de entorno (fuente de verdad)

### Globales (todas las Lambdas en Terraform)

Definidas en `terraform/lambda.tf`:

- `TABLE_NAME` (obligatoria en runtime).
- `BUCKET_NAME` (obligatoria en runtime).
- `OPENAI_API_KEY`.
- `OPENAI_MODEL` (default Terraform: `gpt-4o`).

Variables usadas por runtime (`src/lib/config.ts` y handlers):

- `OPENAI_MAX_OUTPUT_TOKENS` (opcional; default 16384 si no existe o no es válido).
- `ANALYZE_JOBS_QUEUE_URL` (obligatoria para `startAnalyzeJob`).
- `ANDROID_LATEST_VERSION_CODE`, `ANDROID_LATEST_VERSION_NAME`, `ANDROID_PLAY_STORE_URL` (`getAppAndroidConfig`).
- `FCM_SERVICE_ACCOUNT_JSON`, `PUSH_NOTIFICATION_SECRET` (`sendPushNotification`).
- `REGRADE_DELAY_MS` (`regradeProducts`).

### Matriz por Lambda (trigger, contrato y env)

| Lambda | Trigger / Ruta | Contrato resumido | Variables críticas |
|---|---|---|---|
| `analyzeProduct` | `POST /analyze-product` | Body `imageKey` o `imageKeys[]` (máx. 12), opcional `userId`; procesa síncrono y retorna `{source, uid, product}`. | `TABLE_NAME`, `BUCKET_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_OUTPUT_TOKENS` (opcional). |
| `startAnalyzeJob` | `POST /analyze-product/start` | Body `imageKey` o `imageKeys[]`; crea job y encola en SQS; retorna `202` con `jobId`. | Todo lo anterior + `ANALYZE_JOBS_QUEUE_URL` (obligatoria). |
| `getAnalyzeJob` | `GET /analyze-product/job` | Query `jobId` (o `job_id`); responde estado y producto cuando completó. | `TABLE_NAME`. |
| `processAnalysisJob` | SQS (sin ruta HTTP) | Consume mensajes `{jobId,userId,imageKeys}`; ejecuta pipeline y actualiza estado de job. | `TABLE_NAME`, `BUCKET_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_OUTPUT_TOKENS` (opcional). |
| `getUploadUrl` | `POST /upload-url` | Body opcional `fileName`,`contentType`; valida tipo imagen y retorna URL prefirmada + `key`. | `BUCKET_NAME`. |
| `getProduct` | `GET /product` | Query `uid` obligatorio; retorna `product`. | `TABLE_NAME`. |
| `getUserDashboard` | `GET /dashboard` | Query opcional `userId`; retorna `recent_scans`, `shopping_list`, `pending_jobs`, resumen. | `TABLE_NAME`. |
| `addShoppingListItem` | `POST /shopping-list/items` | Body `uid` obligatorio, opcional `userId`; agrega item a canasta del usuario. | `TABLE_NAME`. |
| `evaluateShoppingList` | `POST /shopping-list/evaluate` | Usa `userId` en query o body y devuelve evaluación de canasta. | `TABLE_NAME`. |
| `resetUserSession` | `POST /shopping-list/reset` | Body opcional `shoppingList` (default true), `recentScans` (solo true explícito). | `TABLE_NAME`. |
| `getAppAndroidConfig` | `GET /app/android-config` | Público; retorna `latestVersionCode`, `latestVersionName`, `playStoreUrl`. | `ANDROID_LATEST_VERSION_CODE`, `ANDROID_LATEST_VERSION_NAME`, `ANDROID_PLAY_STORE_URL` (opcionales). |
| `registerFcmToken` | `POST /user/fcm-token` | Query/modelo de identidad + body `fcmToken`; persiste token en perfil de usuario. | `TABLE_NAME`. |
| `sendPushNotification` | `POST /notifications/send` | Header `X-Hexaminer-Push-Secret` + body `{targetUserId,title,body}`; envía FCM v1. | `PUSH_NOTIFICATION_SECRET`, `FCM_SERVICE_ACCOUNT_JSON`, `TABLE_NAME`. |
| `regradeProducts` | Invoke directo (sin ruta HTTP) | Reanaliza productos existentes por lotes usando prompt actual; soporta `resume`. | `TABLE_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_OUTPUT_TOKENS` (opcional), `REGRADE_DELAY_MS` (opcional). |

## Arquitectura funcional (cache-first + deduplicación)

1. El cliente sube imágenes (`/upload-url` + PUT a S3).
2. `analyzeProduct` o `processAnalysisJob` descargan bytes, extraen UID y buscan en `PRODUCT#<uid> / PROFILE`.
3. Si existe, responden desde caché.
4. Si no existe, llaman OpenAI y guardan análisis.
5. Siempre registran scan del usuario.

Regla actual de UID:

- Si detecta barcode (`8-14` dígitos): UID = barcode.
- Si no hay barcode: `extractUidFromImages` genera fallback, luego el pipeline genera un UID canónico `NAME#<hash>` con `marca|nombre|categoría` normalizados para reducir duplicados en reescaneos sin barcode.

## Regrade (`regradeProducts`)

Reanaliza con el prompt desplegado y escribe en el mismo item `PRODUCT#uid / PROFILE`.

Nombre de función: `{project_name}-{stage}-regradeProducts` (default: `product-analysis-api-dev-regradeProducts`).

Payload:

| Campo | Descripción |
|---|---|
| `dryRun` | Si `true`, no escribe en DynamoDB. |
| `maxProducts` | Productos por invocación (`1-25`, default `5`). |
| `onlyUid` | Reanaliza solo un uid específico. |
| `scanSegmentLimit` | Tamaño de página de Scan Dynamo (default `100`). |
| `delayMs` | Pausa entre productos (si falta, usa `REGRADE_DELAY_MS`). |
| `resume` | `{ exclusiveStartKey, skipInPage }` para continuar. |

Para invocaciones largas en CLI AWS usa `--cli-read-timeout 0`.

## Scripts Python (`scripts/`)

```bash
cd services/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements-tools.txt
```

| Script | Uso |
|---|---|
| `scripts/regrade_products_loop.py` | Regrade en loop hasta `finishedTable`. |
| `scripts/find_product_by_name.py` | Busca `PRODUCT#* / PROFILE` por texto en `name`, `brand`, `uid`. |

## Serverless Framework

`serverless.yml` mantiene equivalencia funcional con Terraform, pero el flujo recomendado del repo es Terraform. Si despliegas con Serverless, revisa CORS de S3 manualmente.

## Referencias

- [`../terraform/README.md`](../terraform/README.md)
- [`../docs/architecture.md`](../docs/architecture.md)
- [`../docs/push-fcm-setup.md`](../docs/push-fcm-setup.md)
