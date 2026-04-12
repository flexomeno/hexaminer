# Terraform – API Hexaminer

Despliega en tu cuenta AWS: **DynamoDB** (single-table + GSI1), **S3** (privado, cifrado, política TLS, **CORS** para PUT desde el navegador), **SQS** (cola + DLQ para análisis asíncronos), **IAM** (rol Lambda + política de datos), **varias Lambdas** Node.js 20 (rutas HTTP + consumidor SQS + `regradeProducts` solo por invoke) y **API Gateway HTTP** (CORS).

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
| `sqs.tf` | Cola de jobs de análisis, DLQ, event source mapping → `processAnalysisJob` |
| `iam.tf` | Rol de ejecución Lambda, `AWSLambdaBasicExecutionRole`, política DynamoDB + S3 + SQS |
| `lambda.tf` | `archive_file` por función + `aws_lambda_function` (env: `TABLE_NAME`, `BUCKET_NAME`, `OPENAI_*`, cola donde aplique) |
| `locals.tf` | Mapa de Lambdas: `route_key` HTTP o `null` (SQS / solo invoke) |
| `apigateway.tf` | API HTTP, stage `$default`, integraciones `AWS_PROXY`, rutas, permisos de invocación |
| `outputs.tf` | `api_base_url`, nombres de tabla y bucket, región |
| `terraform.tfvars.example` | Plantilla de variables (no commitear secretos) |
| `variables_ec2_verification.tf` | Variables opcionales `verify_*` para EC2 de pruebas |
| `ec2_verification.tf` | EC2 Amazon Linux 2023, SG SSH, IAM SSM, Key Pair opcional |
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
- `verification_ec2_public_ip` / `verification_ec2_instance_id` / `verification_ec2_ssh_user` – si EC2 activa  
- `verification_ssh_allowed_cidrs` / `verification_ssh_detected_public_ip` – CIDR e IP usados para SSH (modo autodetect)  
- `verification_ec2_private_key_path` – ruta del `.pem` generado (si `verify_ec2_generate_ssh_key = true`)

## Lambdas sin ruta HTTP

- **`processAnalysisJob`:** disparada por mensajes en la cola SQS (no uses `invoke` manual salvo pruebas).
- **`regradeProducts`:** re-análisis masivo con el prompt actual; **solo** `aws lambda invoke` o script en `services/api/scripts/regrade_products_loop.py`. Nombre típico: `{project_name}-{stage}-regradeProducts` (p. ej. `product-analysis-api-dev-regradeProducts`). Invocaciones largas: en AWS CLI añade `--cli-read-timeout 0` (el default ~60 s corta antes de que termine la Lambda).

Documentación de payload y herramientas: **[`../services/api/README.md`](../services/api/README.md)**.

## EC2 de verificación (efímera)

**Por defecto** (`variables_ec2_verification.tf`): `verify_ec2_enabled = true`, SSH permitido desde la **IP pública del equipo que ejecuta `terraform apply`** (consulta `https://api.ipify.org`), y se **genera** un par ED25519: la privada se escribe en **`terraform/.ssh/verification_ec2.pem`** (carpeta en `.gitignore`; **también queda en el estado de Terraform** — trata el state como sensible).

Para **desactivar** la EC2: `verify_ec2_enabled = false` en `terraform.tfvars`.

Si **no** quieres autodetectar la IP (p. ej. `apply` en CI: la IP sería la del runner): en GitHub Actions el workflow ya fuerza `TF_VAR_verify_ec2_enabled=false`. En local manual: `verify_ssh_cidr_auto = false` y `verify_ssh_cidr_ipv4 = ["tu.ip/32"]`.

Si **no** quieres clave generada: `verify_ec2_generate_ssh_key = false` y usa `verify_ec2_public_key` o `verify_ec2_existing_key_name`.

Pasos típicos: `terraform apply` → Ansible (clave: `$(../scripts/verification-ec2-ssh-key.sh)` o la ruta del output `verification_ec2_private_key_path`) → **[`../ansible/README.md`](../ansible/README.md)**.

La instancia tiene **SSM** y lectura **DynamoDB** de la tabla de productos para Next `/admin` vía instance profile.

## Estado remoto (equipos)

Configura un bloque `backend "s3" { ... }` en `versions.tf` para guardar el estado en S3 con bloqueo (DynamoDB).

## Destruir

```bash
terraform destroy
```

Elimina tabla, bucket (y objetos si aplica), Lambdas, API, etc. No ejecutes en producción sin copia de datos.
