# Terraform – API Hexaminer

Despliega en tu cuenta AWS: **DynamoDB** (single-table + GSI1), **S3** (privado, cifrado, política TLS, **CORS** para PUT desde el navegador), **IAM** (rol Lambda + política de datos), **5 Lambdas** (Node.js 20) y **API Gateway HTTP** (CORS).

## Archivos en este directorio

| Archivo | Propósito |
|---------|-----------|
| `versions.tf` | Versión mínima de Terraform; providers `aws` y `archive` |
| `providers.tf` | Región AWS y tags por defecto |
| `variables.tf` | Entradas: `aws_region`, `project_name`, `stage`, `openaikey`, `openai_model`, `default_tags`, `s3_cors_allowed_origins` |
| `locals.tf` | Mapa de Lambdas (nombre, ruta HTTP, timeout, memoria) |
| `data.tf` | `aws_caller_identity` (nombre único del bucket S3) |
| `dynamodb.tf` | Tabla `PK`/`SK` + índice `GSI1` |
| `s3.tf` | Bucket, bloqueo público, cifrado, **CORS**, política de denegación sin TLS |
| `iam.tf` | Rol de ejecución Lambda, `AWSLambdaBasicExecutionRole`, política DynamoDB + S3 |
| `lambda.tf` | `archive_file` por función + `aws_lambda_function` (env: `TABLE_NAME`, `BUCKET_NAME`, `OPENAI_*`) |
| `apigateway.tf` | API HTTP, stage `$default`, integraciones `AWS_PROXY`, rutas, permisos de invocación |
| `outputs.tf` | `api_base_url`, nombres de tabla y bucket, región |
| `terraform.tfvars.example` | Plantilla de variables (no commitear secretos) |
| `.gitignore` | Estado, `.terraform/`, `.build/`, `*.tfvars` |

## Requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.3  
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)  
- Node.js/npm solo para `npm run build:terraform` en `services/api`

## Variables importantes

| Variable | Descripción |
|----------|-------------|
| `openaikey` | Clave OpenAI (sensible). Se recomienda `export TF_VAR_openaikey=...` |
| `s3_cors_allowed_origins` | Orígenes permitidos para subir fotos desde el navegador (por defecto `localhost:3000`). Añade `https://tu-dominio` en producción |
| `openai_model` | Modelo (p. ej. `gpt-4o`); debe coincidir con lo que soporte tu cuenta |

## Pasos de despliegue

1. **Bundles de Lambda** (obligatorio antes de `plan`/`apply`):

```bash
cd ../services/api
npm install
npm run build:terraform
```

2. **Clave OpenAI** (no en git):

```bash
export TF_VAR_openaikey="sk-proj-..."
```

Para probar OpenAI con `curl`: `export OPENAI_API_KEY="$TF_VAR_openaikey"`.

3. **Aplicar:**

```bash
cd ../terraform
terraform init
terraform plan
terraform apply
```

4. Configura **`NEXT_PUBLIC_API_BASE_URL`** en `apps/web` con el output `api_base_url`.

## Actualizar Lambdas tras cambiar código (prompt, handlers)

```bash
cd ../services/api && npm run build:terraform
cd ../terraform && terraform apply
```

## Outputs

- `api_base_url` – URL base del HTTP API (sin barra final)  
- `dynamodb_table_name` – nombre de la tabla  
- `s3_bucket_name` – bucket de subidas  
- `aws_region`

## Estado remoto (equipos)

Configura un bloque `backend "s3" { ... }` en `versions.tf` para guardar el estado en S3 con bloqueo (DynamoDB).

## Destruir

```bash
terraform destroy
```

Elimina tabla, bucket (y objetos si aplica), Lambdas, API, etc. No ejecutes en producción sin copia de datos.
