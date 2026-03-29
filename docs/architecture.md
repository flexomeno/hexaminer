# Arquitectura Serverless - Product Analyzer

## Estructura de carpetas

```text
/apps
  /web                      # Frontend Next.js (App Router)
    /app
      /api/auth/[...nextauth]
      /camera
      /dashboard
    /components
      /analysis
      /layout
      /ui
    /lib
    /types
/services
  /api                      # Backend Serverless (AWS Lambda + API Gateway)
    /src
      /handlers
      /lib
      /types
    serverless.yml
```

## Infraestructura AWS (Serverless Framework)

Archivo principal: `services/api/serverless.yml`

- **API Gateway HTTP API** con CORS abierto para prototipado.
- **Lambdas**:
  - `analyzeProduct` (`POST /analyze-product`)
  - `getUploadUrl` (`POST /upload-url`)
  - `addShoppingListItem` (`POST /shopping-list/items`)
  - `evaluateShoppingList` (`POST /shopping-list/evaluate`)
  - `getUserDashboard` (`GET /dashboard`)
- **DynamoDB**: una sola tabla (`PK`, `SK`) + GSI1 (`GSI1PK`, `GSI1SK`).
- **S3 bucket** privado para imágenes (`BlockPublicAccess` + cifrado AES256).
- **IAM mínimo**: la Lambda puede leer/escribir S3 del bucket y operar sobre la tabla.

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

- `/camera`: captura/subida de foto, análisis, render del resultado.
- `/dashboard`: historial + resumen de canasta.
- Componente `ScoreRing` (estilo Shadcn custom):
  - `0-7`: rojo
  - `8-14`: amarillo
  - `15-20`: verde

## Variables de entorno clave

### Backend (`services/api`)

- `TABLE_NAME`
- `BUCKET_NAME`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o`)

### Frontend (`apps/web`)

- `NEXT_PUBLIC_API_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

## Nota de seguridad IAM/S3

El bucket permanece privado. Solo la Lambda con su rol IAM tiene permisos de `GetObject`/`PutObject` sobre `arn:aws:s3:::<bucket>/*`.
