# Hexaminer Android (nativo)

Cliente **Jetpack Compose** que llama al mismo HTTP API que `apps/web` (presign S3, análisis, dashboard, lista de compras). No embebe WebView.

## Requisitos

- [Android Studio](https://developer.android.com/studio) (Koala o más reciente recomendado)
- JDK 17

## Configurar la API

1. Copia `local.properties.example` a `local.properties` en esta carpeta (Android Studio suele crear `local.properties` solo con `sdk.dir`; añade la clave ahí).
2. Añade la URL base del API Gateway **sin** barra final, por ejemplo:
   `hexaminer.api.baseUrl=https://xxxx.execute-api.us-east-1.amazonaws.com`

Alternativa por entorno: variable `HEXAMINER_API_BASE_URL` al compilar.

Si no configuras nada, `BuildConfig.API_BASE_URL` queda en `https://example.com` y las llamadas fallarán hasta que pongas la URL real.

## Google Sign-In (opcional)

En `app/src/main/res/values/strings.xml`, rellena `default_web_client_id` con el **Web client ID** del proyecto OAuth en Google Cloud (el mismo tipo que usa una app web). Si lo dejas vacío, no se muestra el botón “Entrar con Google”. La app sigue usando un **ID anónimo** guardado en DataStore y lo envía como `userId` en cuerpo/query para alinear escaneos y lista con el backend.

Tras “Entrar con Google”, si la cuenta devuelve **email**, la app envía ese correo como `userId` y el API lo guarda como `email#...` en Dynamo (misma convención que la web). Así historial y lista de compras **se recuperan** al volver a iniciar sesión con la misma cuenta. Si Google no devuelve email, se usa el **id numérico** de la cuenta (`provided#...` en el servidor).

## Funciones

- Elegir imagen de galería o **tomar foto** (cámara + `FileProvider`).
- Flujo: una o varias veces `POST /upload-url` + `PUT` → `POST /analyze-product` con `imageKeys` → intento de `POST /shopping-list/items`.
- **Panel:** `GET /dashboard?userId=...` (escaneos recientes, lista, resumen de canasta).

## Red

`usesCleartextTraffic` y `network_security_config` siguen permitiendo HTTP en debug (p. ej. pruebas locales). Para producción usa **HTTPS** en la URL del API.

## Compilar

Abre la carpeta `hexaminer/android` en Android Studio y ejecuta **Run** en un emulador o dispositivo, o genera un APK firmado desde **Build → Generate Signed Bundle / APK**.
