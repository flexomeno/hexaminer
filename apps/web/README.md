# Hexaminer — Frontend (Next.js)

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_BASE_URL` | URL del API Gateway (Lambdas). |
| `NEXTAUTH_URL` | Origen de la app (ej. `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | Secreto NextAuth. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google. |
| `ALLOWED_USER_EMAILS` | Opcional. Lista separada por comas: si está definida, **solo** esos correos pueden iniciar sesión y el middleware exige login en `/`, `/camera` y `/dashboard`. |
| `ADMIN_EMAILS` | Opcional. Quién puede entrar a `/admin/*`. Si está vacío pero `ALLOWED_USER_EMAILS` tiene valores, los admins son los mismos correos permitidos. Si ambos vacíos, **nadie** es admin (el enlace no aparece). |
| `TABLE_NAME` | Tabla DynamoDB (mismo nombre que output Terraform). Necesaria para **Visibilidad** (`/admin`). |
| `AWS_REGION` | Región AWS (default `us-east-1`). |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Solo en local o si no usas rol de instancia; en **EC2** usa IAM instance profile y omite estas claves. |

## Rutas

- App habitual: `/`, `/camera`, `/dashboard`.
- **Visibilidad** (solo lectura Dynamo): `/admin`, `/admin/productos`, `/admin/ingredientes` (buscador `q`, orden por columna, paginación `?page=`; carga hasta 10.000 ítems por tipo en memoria).

## Build para EC2 (`standalone`)

```bash
npm run build
node .next/standalone/server.js
```

Copia al servidor `.next/standalone`, `.next/static` y `public` (ver [`docs/web-panel-ec2.md`](../../docs/web-panel-ec2.md)).

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).
