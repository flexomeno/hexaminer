# Despliegue paso a paso — EC2 de verificación + Next.js (Visibilidad)

Guía ordenada para levantar la **web** en una **EC2 efímera** (Terraform + Ansible) y ver **/admin** con datos de DynamoDB. El **API serverless** (Lambda + API Gateway) debe existir ya en la misma cuenta AWS.

---

## 0. Prerrequisitos en tu máquina

1. **AWS CLI** configurado (`aws sts get-caller-identity`).
2. **Terraform** ≥ 1.3 (`terraform init` trae providers `http`, `tls`, `local`, `null`).
3. **Ansible** instalado.
4. Salida HTTPS a **api.ipify.org** en el `apply` (autodetectar tu IP para SSH), o bien `verify_ssh_cidr_auto = false` y `verify_ssh_cidr_ipv4` en `terraform.tfvars`.

---

## 1. Desplegar el stack principal (si aún no está)

Desde la raíz del monorepo `hexaminer/`:

```bash
cd services/api
npm install
npm run build:terraform

cd ../../terraform
export TF_VAR_openaikey="sk-..."   # si aplica
terraform init
terraform apply
```

Anota los outputs: **`api_base_url`**, **`dynamodb_table_name`**, **`aws_region`**.

---

## 2. EC2 de verificación (Terraform)

Por defecto la EC2 **sí** se crea. En `terraform/`:

```bash
terraform apply
```

Revisa outputs: `verification_ec2_public_ip`, `verification_ssh_allowed_cidrs`, `verification_ssh_detected_public_ip`, `verification_ec2_private_key_path` (`.pem` en `terraform/.ssh/`). La clave privada **también está en el estado de Terraform**.

Para no crear EC2: `verify_ec2_enabled = false` en `terraform.tfvars`.

**Espera 1–2 minutos** tras el `apply`.

---

## 3. Aprovisionar la EC2 con Ansible

Desde la **raíz** `hexaminer/`:

```bash
IP=$(./scripts/verification-ec2-ip.sh)
KEY=$(./scripts/verification-ec2-ssh-key.sh)
ansible-playbook -i "$IP," -u ec2-user --private-key "$KEY" ansible/playbooks/verify-ec2.yml
```

---

## 4. Preparar el build de Next.js (en tu máquina)

En `apps/web`, configura al menos:

- `NEXT_PUBLIC_API_BASE_URL` = el `api_base_url` de Terraform (sin barra final o con, según cómo esté tu cliente).
- `NEXTAUTH_URL` = URL **final** donde servirás la web en la EC2 (si aún no tienes dominio, `http://IP_PUBLICA_EC2:3000` para una primera prueba).
- **`NEXTAUTH_SECRET`** (obligatorio en producción; sin esto NextAuth responde `Configuration` / `NO_SECRET`).
- **OAuth Google** (opcional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Si no los pones, puedes usar solo usuario/contraseña:
  - `NEXTAUTH_CREDENTIALS_USER` y `NEXTAUTH_CREDENTIALS_PASSWORD` (admin vía sesión fija; ver `apps/web/lib/admin-config.ts`).
- **Privacidad y admin con Google** (opcional):
  - `ALLOWED_USER_EMAILS=tu@correo.com`
  - `ADMIN_EMAILS=tu@correo.com` (o omítelo si quieres que admin = misma lista que `ALLOWED_USER_EMAILS`).
- **Dynamo en el servidor**:
  - `TABLE_NAME` = output `dynamodb_table_name`
  - `AWS_REGION` = misma región que la tabla

En la **EC2**, el SDK usará el **rol de instancia** (no hace falta `AWS_ACCESS_KEY_ID` en el `.env` del servidor).

Genera el build **standalone**:

```bash
cd apps/web
npm install
npm run build
```

---

## 5. Subir la app a la EC2

Opción típica: **`rsync`** desde tu máquina (sustituye `IP` y la ruta local):

```bash
ROOT="$(cd ../.. && pwd)"
IP=$("$ROOT/scripts/verification-ec2-ip.sh")
KEY=$("$ROOT/scripts/verification-ec2-ssh-key.sh")
# Desde hexaminer/apps/web tras npm run build:
rsync -avz --delete -e "ssh -i \"$KEY\"" .next/standalone/ ec2-user@$IP:~/hexaminer-web/
rsync -avz -e "ssh -i \"$KEY\"" .next/static/ ec2-user@$IP:~/hexaminer-web/.next/static/
rsync -avz -e "ssh -i \"$KEY\"" public/ ec2-user@$IP:~/hexaminer-web/public/
```

En el servidor, el `server.js` del standalone suele quedar en `~/hexaminer-web/server.js` (revisa la carpeta generada: a veces hay un subdirectorio `apps/web` dentro de `standalone`; ajusta rutas según lo que liste `ls`).

---

## 6. Variables en la EC2

Por SSH:

```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@$IP
```

Crea en el servidor el archivo **`~/hexaminer-web/.env.production`** (no va en el repo ni en el `rsync` por defecto) con las variables del paso 4.  
Sin este archivo, `NEXTAUTH_SECRET` no se carga y verás `NO_SECRET` / `error=Configuration`.

```bash
cd ~/hexaminer-web
set -a
source .env.production
set +a
node server.js
```

(Líneas `VAR=valor` sin espacios alrededor del `=`. El patrón `export $(grep … | xargs)` suele fallar si el archivo no existe o si los valores tienen caracteres especiales.)

### 6.1 Arranque automático al iniciar EC2 (script + systemd)

Solución aplicada: **script de arranque + systemd** para que el servicio suba solo al boot y para calcular `NEXTAUTH_URL` desde la IP actual de la instancia.

> Recomendación: deja `NEXTAUTH_URL` fuera de `.env.production`; el script la calcula y la exporta en cada inicio.

1) Crea el script `~/hexaminer-web/start.sh`:

```bash
cat > ~/hexaminer-web/start.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd /home/ec2-user/hexaminer-web

# Carga variables base (NEXTAUTH_SECRET, TABLE_NAME, etc.)
set -a
source /home/ec2-user/hexaminer-web/.env.production
set +a

# IMDSv2: toma IP pública; si no existe, usa la privada.
TOKEN="$(curl -sf -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')"
IP="$(curl -sf -H \"X-aws-ec2-metadata-token: ${TOKEN}\" \
  http://169.254.169.254/latest/meta-data/public-ipv4 \
  || curl -sf -H \"X-aws-ec2-metadata-token: ${TOKEN}\" \
  http://169.254.169.254/latest/meta-data/local-ipv4)"

export NEXTAUTH_URL="http://${IP}:3000"
exec /usr/bin/node /home/ec2-user/hexaminer-web/server.js
EOF

chmod +x ~/hexaminer-web/start.sh
```

2) Crea el servicio systemd:

```bash
sudo tee /etc/systemd/system/hexaminer-web.service > /dev/null <<'EOF'
[Unit]
Description=Hexaminer Web (Next standalone)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/hexaminer-web
ExecStart=/home/ec2-user/hexaminer-web/start.sh
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
EOF
```

3) Habilita y arranca:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hexaminer-web
sudo systemctl start hexaminer-web
```

4) Logs y control:

```bash
sudo systemctl status hexaminer-web
sudo journalctl -u hexaminer-web -f
sudo systemctl restart hexaminer-web
```

---

## 7. Abrir el puerto de la app (si hace falta)

Por defecto el security group de la EC2 de verificación **solo tiene SSH (22)**. Para probar en `:3000` sin Nginx:

- Añade en Terraform una regla **ingress** temporal `TCP 3000` desde tu IP, **o**
- Usa **túnel SSH**:  
  `ssh -i ~/.ssh/id_ed25519 -L 3000:127.0.0.1:3000 ec2-user@$IP`  
  y abre `http://localhost:3000` en tu navegador.

Más adelante: **Nginx** en 80/443 con proxy a `127.0.0.1:3000` y (opcional) Let’s Encrypt.

---

## 8. Verificar

1. Inicia sesión: **Google** (si lo configuraste) con un correo de `ALLOWED_USER_EMAILS`, o **Usuario y contraseña** si solo definiste `NEXTAUTH_CREDENTIALS_*`.
2. Debe aparecer **Visibilidad** en la barra (si eres admin).
3. Entra a **`/admin/productos`** y **`/admin/ingredientes`**; si falta `TABLE_NAME` o permisos IAM, verás el mensaje de error en pantalla.

---

## 9. Apagar cuando termines (ahorro de coste)

```bash
aws ec2 stop-instances --instance-ids "$(terraform -chdir=terraform output -raw verification_ec2_instance_id)"
```

O elimina la instancia del estado gestionado:

```bash
export TF_VAR_verify_ec2_enabled=false
cd terraform && terraform apply
```

---

## Referencias rápidas

| Documento | Contenido |
|-----------|-----------|
| [`ansible/README.md`](../ansible/README.md) | EC2 + Ansible |
| [`apps/web/README.md`](../apps/web/README.md) | Variables de entorno del front |
| [`terraform/README.md`](../terraform/README.md) | Variables `verify_*` y outputs |
| [`docs/web-panel-ec2.md`](web-panel-ec2.md) | Decisiones de arquitectura |

---

## Checklist mínimo

- [ ] `terraform apply` stack + EC2 verificación  
- [ ] `ansible-playbook` verify-ec2  
- [ ] `npm run build` en `apps/web` (standalone)  
- [ ] `rsync` standalone + static + public  
- [ ] `.env.production` en servidor con `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_BASE_URL`, `TABLE_NAME`, y (Google **o** `NEXTAUTH_CREDENTIALS_*`; listas de correo opcionales)  
- [ ] `hexaminer-web.service` habilitado (`systemctl enable --now`) + acceso por túnel o SG puerto 3000  
- [ ] Probar `/admin`  
- [ ] Parar instancia al acabar  
