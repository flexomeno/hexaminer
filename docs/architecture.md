# Arquitectura actual de Hexaminer

Documento de alto nivel para la arquitectura desplegada (AWS + app web + app Android) y el flujo de análisis/cache.

## Vista general

```text
apps/web            Frontend Next.js (cámara, dashboard, auth)
android/            App nativa Compose (mismo HTTP API)
services/api        Lambdas TypeScript (handlers + libs)
terraform/          Infra AWS (API, Lambdas, S3, Dynamo, SQS, IAM)
docs/               Guías técnicas y operativas
```

## Infraestructura (Terraform recomendado)

Componentes desplegados en `terraform/`:

- API Gateway HTTP (`$default`) con rutas a Lambdas.
- Lambdas Node.js 20 (HTTP, worker SQS y función operativa sin ruta).
- SQS principal + DLQ para análisis asíncronos.
- DynamoDB single-table (`PK`, `SK`, `GSI1PK`, `GSI1SK`).
- S3 privado para imágenes (PUT por URL prefirmada, CORS configurable).
- IAM para ejecución Lambda (CloudWatch, Dynamo, S3, SQS).

`services/api/serverless.yml` existe como alternativa, pero el flujo principal documentado del repo es Terraform.

## Endpoints HTTP activos

| Método | Ruta | Función |
|---|---|---|
| POST | `/analyze-product` | análisis síncrono |
| POST | `/analyze-product/start` | crea job y encola en SQS |
| GET | `/analyze-product/job` | consulta estado de job |
| POST | `/upload-url` | URL prefirmada para S3 |
| GET | `/product` | producto por uid |
| GET | `/dashboard` | historial + canasta + jobs pendientes |
| POST | `/shopping-list/items` | agrega producto a canasta |
| POST | `/shopping-list/evaluate` | evalúa canasta |
| POST | `/shopping-list/reset` | limpia canasta y/o historial |
| GET | `/app/android-config` | config pública de versión Android |
| POST | `/user/fcm-token` | registra token FCM por usuario |
| POST | `/notifications/send` | envía push (protegida por secreto) |

Funciones sin ruta:

- `processAnalysisJob`: consumidora de SQS.
- `regradeProducts`: operación manual por `aws lambda invoke`.

## Single-table en DynamoDB

### Claves

- `PK` (partition key), `SK` (sort key).
- `GSI1PK`, `GSI1SK` (accesos secundarios).

### Entidades principales

- Producto: `PK = PRODUCT#<uid>`, `SK = PROFILE`.
- Perfil de usuario: `PK = USER#<userId>`, `SK = PROFILE`.
- Historial de scans: `PK = USER#<userId>`, `SK = SCAN#<timestamp>#<uid>`.
- Item de canasta: `PK = USER#<userId>`, `SK = SHOPPING#<uid>`.
- Job async: `PK = JOB#<jobId>`, `SK = META` + referencia en `USER#...`.

## Flujo de análisis y deduplicación

1. Cliente pide `/upload-url` y sube imagen(es) a S3.
2. Cliente llama `/analyze-product` o `/analyze-product/start`.
3. Pipeline descarga imágenes y calcula UID:
   - barcode detectado (`8-14` dígitos) -> UID barcode,
   - si no hay barcode -> fallback desde imagen/keys,
   - antes de guardar, se genera UID canónico `NAME#<hash>` con `marca|nombre|categoría` para reducir duplicados sin barcode.
4. Busca `PRODUCT#uid`:
   - existe -> responde caché (`source = "cache"`),
   - no existe -> llama OpenAI, guarda producto y responde (`source = "openai"`).
5. Registra scan del usuario y actualiza canasta según flujo.

## Push notifications (FCM)

- Android registra token en `/user/fcm-token`.
- `sendPushNotification` valida header `X-Hexaminer-Push-Secret`.
- Luego usa FCM HTTP v1 con `FCM_SERVICE_ACCOUNT_JSON`.
- Requisito clave: `project_id` de la cuenta de servicio debe coincidir con el proyecto de `google-services.json` de la app.

Guía operativa: [`push-fcm-setup.md`](push-fcm-setup.md).

## Variables de entorno

- Las variables globales y específicas por Lambda están detalladas en [`services/api/README.md`](../services/api/README.md).
- Terraform las inyecta desde `terraform/lambda.tf` y `terraform/locals.tf`.

## Notas de seguridad

- Bucket S3 privado (acceso por IAM de Lambda y URLs prefirmadas).
- `/notifications/send` no debe usarse sin secreto fuerte.
- Si expones secretos accidentalmente (terminal/chat), rótalos.
