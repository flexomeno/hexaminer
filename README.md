# Hexaminer - Product Analysis Serverless

Aplicación serverless para analizar productos (alimentos, cosméticos y aseo) mediante foto de etiqueta, con enfoque en riesgos endocrinos, nota global (0–20), ética laboral de marca y caché global en DynamoDB.

## Estructura del proyecto

```text
apps/web           Frontend Next.js (App Router) + Tailwind + NextAuth
android/           App Android nativa (Compose) — mismo HTTP API que la web
services/api       Lambdas TypeScript + scripts Python de operación (regrade, búsqueda Dynamo)
terraform/         Infraestructura AWS (recomendado): IaC con Terraform
docs/              Arquitectura, single-table DynamoDB, flujos
scripts/           Utilidades CLI en raíz (análisis desde imagen local, prueba OpenAI)
```

La infra desplegada con **Terraform** incluye: **API Gateway HTTP**, **varias Lambdas** Node.js 20 (HTTP + worker SQS + `regradeProducts` solo invoke), **SQS** (cola de análisis asíncronos), **DynamoDB** (single-table + GSI1), **S3** (subidas con URL prefirmada + **CORS**), **IAM**. Detalle en [`terraform/README.md`](terraform/README.md) y backend en [`services/api/README.md`](services/api/README.md).

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

### App Android (mismas funciones que la web)

Carpeta **`android/`**: app **Compose** que habla con el API AWS (presign, análisis, dashboard). Configura la URL del API en `local.properties` (`hexaminer.api.baseUrl`). Instrucciones: **[`android/README.md`](android/README.md)**. Añade el **origen HTTPS** de producción en **CORS del bucket S3** (`s3_cors_allowed_origins` en Terraform) cuando publiques el front.

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

### Re-análisis masivo (mismo ítem en Dynamo)

Si cambias el prompt y quieres **reevaluar productos ya guardados** sin borrar filas, usa la Lambda **`regradeProducts`** (invocación directa, sin ruta HTTP). Resumen de payload, nombre de función y scripts Python en **[`services/api/README.md`](services/api/README.md)**.

---

## Scripts en la raíz (`scripts/`)

| Script | Uso |
|--------|-----|
| `analyze-label.sh` | Sube una imagen local al API y muestra el JSON del análisis. `-h` para ayuda. |
| `test-openai-responses.sh` | Prueba `https://api.openai.com/v1/responses` con `TF_VAR_openaikey` u `OPENAI_API_KEY`. |

---

## Caché (DynamoDB)

Los productos analizados se guardan como filas `PRODUCT#<uid>` / `SK = PROFILE`. Mientras exista el ítem, el API puede devolver **caché** para ese uid. Para refrescar: borrar el ítem, usar la Lambda **`regradeProducts`** (lote, mismo prompt que el código desplegado) o el flujo descrito en arquitectura. Búsqueda operativa por nombre/marca: [`services/api/scripts/find_product_by_name.py`](services/api/scripts/find_product_by_name.py) (ver [`services/api/README.md`](services/api/README.md)).

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
| [`services/api/README.md`](services/api/README.md) | Lambdas y rutas, SQS/async, `regradeProducts`, scripts Python |
| [`docs/architecture.md`](docs/architecture.md) | Single-table DynamoDB, flujo cache-first, endpoints, Terraform vs Serverless, seguridad |
| [`terraform/README.md`](terraform/README.md) | Lista de `.tf`, variables, outputs, CORS, estado remoto |
| [`terraform/terraform.tfvars.example`](terraform/terraform.tfvars.example) | Ejemplo de variables (no commitear secretos) |
| [`android/README.md`](android/README.md) | App Android nativa (API URL, Google OAuth opcional) |
| [`docs/descripcion-y-politica-de-datos.md`](docs/descripcion-y-politica-de-datos.md) | Texto de producto y privacidad (plantilla) |
