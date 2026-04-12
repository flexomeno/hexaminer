# Panel web en EC2 — enfoque recomendado

**Guía operativa paso a paso:** [`despliegue-ec2-paso-a-paso.md`](despliegue-ec2-paso-a-paso.md)

Objetivo: **la misma experiencia que hoy** (landing, cámara, dashboard) **más** dos vistas internas: **todos los productos** y **todos los ingredientes**, con acceso **restringido**, desplegado de forma **reproducible** (Terraform + Ansible).

## Principio: una sola aplicación Next.js

Mantén **un solo proyecto** (`apps/web`):

- Rutas públicas o de producto igual que ahora (o protegidas globalmente si solo tú usas la app).
- Rutas **`/admin/productos`** y **`/admin/ingredientes`** (y opcionalmente `/admin` como índice) solo para cuentas autorizadas.
- Mismo diseño (Tailwind, componentes), mismo `NEXT_PUBLIC_API_BASE_URL` hacia tu API serverless actual.

Así evitas duplicar lógica, cookies de sesión y estilos entre “app” y “panel”.

## Cómo obtener datos de Dynamo (dos opciones limpias)

### Opción A — Recomendada en EC2 con instancia dedicada: IAM Instance Profile

- Asignas a la EC2 un **rol IAM** con política mínima: `dynamodb:Scan` + `dynamodb:GetItem` **solo** sobre el ARN de tu tabla (y, si usas índices, el ARN del índice).
- En Next.js, en **Route Handlers** o **Server Components** que solo ejecutan en servidor (`runtime = 'nodejs'`), usas **`@aws-sdk/lib-dynamodb`** con la cadena de credenciales por defecto (coge automáticamente el rol de la instancia).
- **Ventaja:** no guardas `AWS_ACCESS_KEY_ID` en disco; rotación y auditoría vía IAM.
- **Paginación:** los listados deben usar `Scan` paginado (`Limit` + `ExclusiveStartKey`) y pasar el cursor por query string; nunca devolver la tabla entera en una respuesta.

**Filtros en Dynamo (recordatorio):**

- Productos perfil: `SK = PROFILE` y `PK` que empiece por `PRODUCT#` (o `entityType = PRODUCT` si siempre está relleno).
- Ingredientes: `entityType = INGREDIENT` y `SK = PROFILE` (como en `services/api/src/lib/dynamo.ts`).

### Opción B — Sin permisos Dynamo en la EC2: Lambdas de solo lectura

- Añades en el API (Lambda + API Gateway) endpoints internos, por ejemplo `GET /admin/products` y `GET /admin/ingredients`, protegidos con **un secreto** (`Authorization: Bearer …`) o **API Gateway Lambda authorizer** mínimo.
- La EC2 solo necesita ese **token** en variable de entorno (o SSM Parameter Store leído al arranque).
- **Ventaja:** la máquina no tiene permiso directo sobre la base de datos.
- **Inconveniente:** más piezas (despliegue de Lambdas, límites de tiempo/tamaño de respuesta en API Gateway si un día la tabla crece mucho).

**Criterio:** si la EC2 es **solo tuya y efímera**, la **opción A** suele ser la más simple y “limpia” operativamente. Si la política de seguridad exige **cero acceso a datos desde el host**, usa **B**.

## Autenticación (solo tú + admin)

1. **Lista blanca de correos** (`ALLOWED_USER_EMAILS`) en NextAuth: nadie más entra con Google.
2. **Lista de administradores** (`ADMIN_EMAILS`) para rutas `/admin/*` (puede ser el mismo correo si eres el único usuario).
3. **Middleware** de Next.js: exige sesión en lo privado; en `/admin` comprueba además que el correo sea admin.

Así el panel no depende de Basic Auth genérico ni de exponer rutas sin sesión.

## Build y proceso en la EC2 (recomendado: output `standalone`)

1. En el repo: `npm ci && npm run build` dentro de `apps/web` con `output: 'standalone'` en `next.config.ts`.
2. Copias al servidor la carpeta `.next/standalone`, `.next/static` y `public` (Ansible puede hacer `rsync` o clonar y build en la propia EC2).
3. Arranque con **systemd**: `ExecStart=/usr/bin/node server.js` (o la ruta que genere standalone), `EnvironmentFile=/etc/hexaminer/web.env`.
4. **Nginx** (o Caddy) delante: TLS, proxy a `127.0.0.1:3000`, cabeceras `Host`/`X-Forwarded-For` correctas para NextAuth.

No hace falta PHP en el stack “LAMP”; el paralelo es **Linux + Nginx + Node**, que es el encaje natural para Next.js.

## Ansible (orden sugerido)

1. Playbook actual (base OS + Node 20).
2. Rol o tareas: usuario de sistema, directorio de despliegue, `rsync`/git, `npm ci`, `npm run build`.
3. Plantilla `web.env` (sin commitear secretos): `NEXTAUTH_*`, `GOOGLE_*`, `NEXT_PUBLIC_API_BASE_URL`, `TABLE_NAME` solo si usas opción A en el mismo Node, etc.
4. Unidad **systemd** `hexaminer-web.service`.
5. Opcional: **Nginx** + certificado (Let’s Encrypt con `certbot` si hay DNS público).

## Resumen

| Pieza | Recomendación |
|--------|----------------|
| Código | Un solo Next.js: app + `/admin/productos` + `/admin/ingredientes`. |
| Datos admin | Opción A: IAM de instancia + Scan paginado en servidor; opción B: Lambdas de lectura + token. |
| Auth | NextAuth Google + allowlist + middleware para admin. |
| Servidor | Node `standalone` + systemd + Nginx TLS. |
| Provision | Terraform (EC2) + Ansible (playbook extendido). |

## Estado de la implementación en el repo

En `apps/web` ya existen **`/admin`**, **`/admin/productos`** y **`/admin/ingredientes`** (Scan paginado), más middleware opcional con `ALLOWED_USER_EMAILS` / `ADMIN_EMAILS`. Variables: ver `apps/web/README.md`. En Terraform, la EC2 de verificación tiene política IAM de **solo lectura** sobre la tabla Dynamo.

Siguiente paso operativo: ampliar Ansible (build, `systemd`, Nginx) según tu entorno.
