# Hexaminer - Product Analysis Serverless

Aplicación serverless para analizar productos (alimentos, cosméticos y aseo)
mediante foto de etiqueta, con enfoque:

- Riesgos endocrinos
- Nota global (0-20)
- Ética laboral de marca
- Ahorro de costos con caché global en DynamoDB

## Estructura del proyecto

```text
/apps/web        -> Frontend Next.js App Router + Tailwind + NextAuth
/services/api    -> Backend AWS Lambda + API Gateway + DynamoDB + S3 + OpenAI
/docs            -> Documentación técnica (arquitectura, single-table, etc.)
```

## Frontend (Next.js)

Ubicación: `apps/web`

Pantallas iniciales:
- `/` landing con overview
- `/camera` captura/subida y análisis
- `/dashboard` historial de escaneos y nota de canasta

Variables recomendadas (`apps/web/.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret-largo>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

## Backend Serverless (AWS)

Ubicación: `services/api`

Incluye:
- `POST /upload-url`
- `POST /analyze-product` (cache-first: DynamoDB -> OpenAI -> save)
- `POST /shopping-list/items`
- `POST /shopping-list/evaluate`
- `GET /dashboard`

Variables requeridas:

```bash
OPENAI_API_KEY=<tu-openai-key>
```

El resto de variables (`TABLE_NAME`, `BUCKET_NAME`, `OPENAI_MODEL`) se definen desde `serverless.yml`.

## Deploy backend

### Opción A: Serverless Framework (como hasta ahora)

```bash
cd services/api
npm install
npx serverless deploy --stage dev --region us-east-1
```

### Opción B: Terraform (infra como código)

Infra equivalente en `terraform/`: DynamoDB, S3, IAM, Lambdas y HTTP API Gateway.

1. **Credenciales AWS** (CLI o variables de entorno) con permisos para crear los recursos.
2. **Empaquetar Lambdas** (genera `terraform/.build/lambda/...`):

```bash
cd services/api
npm install
npm run build:terraform
```

3. **Aplicar Terraform** (desde la raíz del repo `hexaminer`):

```bash
cd terraform
terraform init
export TF_VAR_openaikey="sk-proj-..."  # variable de entorno que usa Terraform para OpenAI
terraform apply
```

4. Copia el output `api_base_url` y configúralo en el frontend como `NEXT_PUBLIC_API_BASE_URL`.

Detalle de variables y estado remoto opcional: `terraform/terraform.tfvars.example`.

## Ejecutar frontend local

```bash
cd apps/web
npm install
npm run dev
```

## Scripts (`scripts/`)

- **`analyze-label.sh`** — Sube una imagen local (jpg/png/webp) al API desplegado y muestra el JSON del análisis. Usa `terraform output api_base_url` o `HEXAMINER_API_BASE_URL`. Ver `./scripts/analyze-label.sh -h`.
- **`test-openai-responses.sh`** — Comprueba `/v1/responses` con `TF_VAR_openaikey` u `OPENAI_API_KEY`.

## Documentación

Revisa `docs/architecture.md` para:
- diseño single-table DynamoDB
- flujo cache-first
- recomendaciones IAM/S3
