# Hexaminer - Product Analysis Serverless

Aplicación serverless para analizar productos (alimentos, cosméticos y aseo) mediante foto de etiqueta, con enfoque en riesgos endocrinos, nota global (0–20), ética laboral de marca y caché global en DynamoDB.

## Estructura del proyecto

```text
apps/web           Frontend Next.js (App Router) + Tailwind + NextAuth
services/api       Código TypeScript de Lambdas (handlers, OpenAI, DynamoDB, S3)
terraform/         Infraestructura AWS (recomendado): IaC con Terraform
docs/              Arquitectura, single-table DynamoDB, flujos
scripts/           Utilidades CLI (análisis desde imagen local, prueba OpenAI)
```

La infra desplegada con **Terraform** incluye: **API Gateway HTTP**, **5 Lambdas** (Node.js 20), **DynamoDB** (single-table + GSI1), **S3** (subidas con URL prefirmada + **CORS** para el navegador), **IAM**. Detalle de archivos `.tf` en [`terraform/README.md`](terraform/README.md).

> **Alternativa:** también existe `services/api/serverless.yml` (Serverless Framework) para un despliegue equivalente; el flujo documentado en detalle para producción/dev en este repo es **Terraform**.

---

## Frontend (`apps/web`)

Rutas: `/` (landing), `/camera` (foto y análisis), `/dashboard` (historial y canasta).

Variables en `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<cadena larga; no uses $(cmd) en el archivo, pega el valor>
GOOGLE_CLIENT_ID=<id de cliente OAuth web>
GOOGLE_CLIENT_SECRET=<secreto>
```

Tras editar `.env.local`, reinicia `npm run dev`. En Google Cloud Console, añade orígenes y redirect para `http://localhost:3000` y tu dominio de producción.

```bash
cd apps/web && npm install && npm run dev
```

---

## Backend: despliegue con Terraform (recomendado)

1. **AWS CLI** configurado y permisos para crear los recursos.
2. **Empaquetar Lambdas** (obligatorio antes de `plan`/`apply`):

```bash
cd services/api
npm install
npm run build:terraform
```

3. **Variables de Terraform** (principalmente la clave OpenAI):

```bash
export TF_VAR_openaikey="sk-proj-..."   # o OPENAI_API_KEY en curl a OpenAI, ver terraform/README.md
cd terraform
terraform init
terraform apply
```

4. Copia **`api_base_url`** del output y úsala como `NEXT_PUBLIC_API_BASE_URL`.

5. **CORS en S3:** el bucket permite subidas desde el navegador; por defecto `localhost:3000` y `127.0.0.1:3000`. Para producción, amplía `s3_cors_allowed_origins` (ver `terraform/variables.tf` y `terraform.tfvars.example`).

Documentación ampliada: **[`terraform/README.md`](terraform/README.md)** (tabla de archivos, variables, outputs, actualizar código, destruir).

---

## Actualizar solo el código de las Lambdas (prompt, lógica)

El prompt de OpenAI está en `services/api/src/lib/openai.ts`. Tras cualquier cambio:

```bash
cd services/api && npm run build:terraform
cd ../terraform && terraform apply
```

---

## Scripts (`scripts/`)

| Script | Uso |
|--------|-----|
| `analyze-label.sh` | Sube una imagen local al API y muestra el JSON del análisis. `-h` para ayuda. |
| `test-openai-responses.sh` | Prueba `https://api.openai.com/v1/responses` con `TF_VAR_openaikey` u `OPENAI_API_KEY`. |

---

## Caché (DynamoDB)

Los productos analizados se guardan como filas `PRODUCT#<uid>`. Para forzar un nuevo análisis con OpenAI, borra ese ítem en DynamoDB o usa el flujo descrito en la documentación de arquitectura.

---

## Backend alternativo: Serverless Framework

```bash
cd services/api
npm install
npx serverless deploy --stage dev --region us-east-1
```

Variables: `OPENAI_API_KEY` y las definidas en `serverless.yml`.

---

## Documentación adicional

| Documento | Contenido |
|-----------|-----------|
| [`docs/architecture.md`](docs/architecture.md) | Single-table DynamoDB, flujo cache-first, endpoints, Terraform vs Serverless, seguridad |
| [`terraform/README.md`](terraform/README.md) | Lista de `.tf`, variables, outputs, CORS, estado remoto |
| [`terraform/terraform.tfvars.example`](terraform/terraform.tfvars.example) | Ejemplo de variables (no commitear secretos) |
