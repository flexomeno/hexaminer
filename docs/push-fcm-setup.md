# Push notifications (FCM) + Hexaminer

Flujo: la app Android registra el **token FCM** en tu API (`POST /user/fcm-token` → DynamoDB en el item `USER#…` / `SK = PROFILE`, campos `fcm_token`, `fcm_token_updated_at`). Para **enviar**, una Lambda llama a la **API HTTP v1 de FCM** con una **cuenta de servicio** de Google.

---

## 1. Firebase / Google Cloud

1. Entra en [Firebase Console](https://console.firebase.google.com/) y **crea un proyecto** (o usa uno existente).
2. **Añade una app Android** con el package `com.hexaminer.app` (el mismo `applicationId` del proyecto).
3. Descarga **`google-services.json`** y cópialo a:

   `hexaminer/android/app/google-services.json`

   (no lo subas a git; ya está en `.gitignore`.)

4. En Firebase: **Project settings** → **Cloud Messaging** → asegúrate de que la API esté habilitada (FCM v1).
5. **Cuenta de servicio** para el backend:
   - Google Cloud Console → **IAM y administración** → **Cuentas de servicio** → crea o elige una cuenta vinculada al proyecto de Firebase.
   - **Claves** → **Añadir clave** → **JSON**. Guárdala en lugar seguro.
   - En la cuenta de servicio, rol mínimo habitual: **Firebase Cloud Messaging API Admin** (o un rol que permita enviar mensajes FCM v1; según consola puede aparecer como rol de Firebase).

El JSON contiene `project_id`, `client_email`, `private_key`, etc. Ese string completo es el valor de **`FCM_SERVICE_ACCOUNT_JSON`** en la Lambda `sendPushNotification` (ver paso 3).

---

## 2. Backend (despliegue)

1. En `services/api`: `npm install` y `npm run build:terraform`.
2. En `terraform`: `terraform apply` (o tu flujo habitual).

Quedan dos rutas nuevas:

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/user/fcm-token` | App Android; body `{"fcmToken":"..."}`; query `userId` igual que en el resto de la API. |
| `POST` | `/notifications/send` | Envío manual o desde tu automatización; requiere cabecera secreta (paso 3). |

---

## 3. Variables de entorno (Lambda `sendPushNotification`)

Configúralas en **AWS Console → Lambda → `…-sendPushNotification` → Configuration → Environment variables** (o amplía `terraform/locals.tf` si prefieres gestionarlas ahí; el JSON puede ser largo para Terraform).

| Variable | Descripción |
|----------|-------------|
| `FCM_SERVICE_ACCOUNT_JSON` | Contenido **completo** del JSON de la cuenta de servicio (una sola línea o pégalo tal cual si el editor lo permite). |
| `PUSH_NOTIFICATION_SECRET` | Secreto largo que solo tú conoces; debe coincidir con la cabecera al llamar a `/notifications/send`. |

Si alguna falta o el JSON es inválido, la Lambda responde `503` o error claro.

> Recomendación: si el JSON es muy largo, configúralo en consola AWS Lambda en lugar de Terraform para evitar diffs innecesarios.

### Ejemplo de envío con `curl`

Sustituye `API_BASE`, `SECRETO`, `USER_ID` y el cuerpo:

```bash
curl -sS -X POST "${API_BASE}/notifications/send" \
  -H "Content-Type: application/json" \
  -H "X-Hexaminer-Push-Secret: ${SECRETO}" \
  -d "{\"targetUserId\":\"${USER_ID}\",\"title\":\"Hexaminer\",\"body\":\"Tu mensaje aquí\"}"
```

Si tu secreto contiene `$`, en shell usa comillas simples para evitar expansión:

```bash
SECRETO='tu$secreto$con$simbolos'
```

- **`targetUserId`**: el mismo `userId` que en DynamoDB, p. ej. `email#usuario@gmail.com` (minúsculas como las normaliza el API) o `provided#…` si la app usó id numérico.
- El usuario debe haber abierto la app al menos una vez **tras desplegar FCM** para que exista `fcm_token` en su `PROFILE`.

---

## 4. App Android

1. Coloca **`app/google-services.json`** (paso 1).
2. Vuelve a compilar; el plugin `google-services` solo se aplica si ese archivo existe.
3. Tras iniciar sesión, la app pide **notificaciones** (Android 13+) y llama a **`POST /user/fcm-token`**.
4. Si el token rota, `HexaminerMessagingService` lo vuelve a registrar cuando ya hay sesión.

Sin `google-services.json`, la app funciona igual pero **no** registrará push.

---

## 5. Seguridad

- **`/notifications/send`** no debe ser público sin el secreto: cualquiera con la URL podría intentar spamear; usa un **`PUSH_NOTIFICATION_SECRET`** fuerte y solo en servidor / scripts internos.
- **`/user/fcm-token`** sigue el mismo modelo que el resto de endpoints con `userId` en query (como el dashboard): asume que quien controla el cliente es el usuario; si en el futuro añades JWT en API Gateway, podrás restringir más.

---

## 6. Prueba rápida

1. Instala la app con `google-services.json`, inicia sesión, acepta notificaciones.
2. En DynamoDB, comprueba que el `PROFILE` del usuario tiene `fcm_token`.
3. Ejecuta el `curl` de arriba con `targetUserId` correcto.
4. Deberías recibir la notificación en el dispositivo (en segundo plano o según canal del sistema).

---

## 7. Troubleshooting común

### `{"error":"No autorizado"}`

- El header `X-Hexaminer-Push-Secret` no coincide con `PUSH_NOTIFICATION_SECRET`.
- Verifica espacios y escapes en shell (especialmente `$` en secretos).

### `FCM HTTP 403 ... SENDER_ID_MISMATCH`

- El token FCM del dispositivo y el `FCM_SERVICE_ACCOUNT_JSON` son de proyectos Firebase distintos.
- Comprueba que coincida al menos `project_id`:
  - `android/app/google-services.json` -> `project_info.project_id`
  - service account JSON -> `project_id`
- Después de corregir, reabre/reinstala la app para refrescar `fcm_token` y vuelve a probar.

### `FCM_SERVICE_ACCOUNT_JSON no configurado` o `PUSH_NOTIFICATION_SECRET no configurado`

- Falta variable en Lambda `sendPushNotification`.
- Configúrala en AWS Console o Terraform, y despliega.
