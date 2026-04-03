# Terraform – API Hexaminer

Despliega en tu cuenta AWS: tabla DynamoDB (single-table + GSI1), bucket S3 privado, rol IAM, cinco funciones Lambda (Node.js 20) y API Gateway HTTP con CORS abierto (igual que `serverless.yml`).

## Requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.3
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configurado (`aws configure` o variables de entorno)
- Node.js y npm (solo para empaquetar Lambdas antes de `apply`)

## Pasos

1. Generar los bundles de Lambda (obligatorio antes de `terraform plan` / `apply`):

```bash
cd ../services/api
npm install
npm run build:terraform
```

2. Clave de OpenAI (no la guardes en el repo). **Forma habitual:** define solo `TF_VAR_openaikey` en tu entorno (Terraform la mapea a la variable `openaikey`):

```bash
export TF_VAR_openaikey="sk-proj-..."   # en tu shell o en CI, nunca en git
```

Para probar la API de OpenAI con `curl` usando la misma variable:

```bash
export OPENAI_API_KEY="$TF_VAR_openaikey"
curl -sS https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-4o","input":"Say hi in one word."}'
```

Alternativa: `terraform.tfvars` con `openaikey = "sk-..."` (archivo en `.gitignore`).

3. Inicializar y aplicar:

```bash
cd ../terraform
terraform init
terraform plan
terraform apply
```

4. Usa el output `api_base_url` como `NEXT_PUBLIC_API_BASE_URL` en `apps/web`.

## Estado remoto (recomendado en equipo)

Descomenta y configura un bloque `backend "s3" { ... }` en `versions.tf` para guardar el estado en un bucket S3 con bloqueo DynamoDB.

## Destruir

```bash
terraform destroy
```

Los datos en DynamoDB y S3 se eliminan con el destroy (tabla y bucket incluidos, salvo que añadas `prevent_destroy`).
