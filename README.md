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

```bash
cd services/api
npm install
npx serverless deploy --stage dev --region us-east-1
```

## Ejecutar frontend local

```bash
cd apps/web
npm install
npm run dev
```

## Documentación

Revisa `docs/architecture.md` para:
- diseño single-table DynamoDB
- flujo cache-first
- recomendaciones IAM/S3
