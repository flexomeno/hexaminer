# Ansible — EC2 de verificación (Hexaminer)

La instancia se crea con **Terraform** (por defecto **sí**, salvo `verify_ec2_enabled = false` en `terraform.tfvars`). Luego **Ansible**; al terminar, **parar** o **apagar** la instancia.

## Requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) y AWS CLI configurados.
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/index.html) ≥ 2.14 en tu máquina.
- Clave **privada** para SSH: por defecto Terraform la genera y la deja en `terraform/.ssh/verification_ec2.pem` (ruta también en el output `verification_ec2_private_key_path`). Script: `scripts/verification-ec2-ssh-key.sh`.

## 1. Lanzar la EC2 con Terraform

Por defecto: **IP de SSH** = la del equipo que ejecuta `apply` (vía api.ipify.org; ver output `verification_ssh_detected_public_ip` y `verification_ssh_allowed_cidrs`). **Clave** generada automáticamente.

```bash
cd terraform
terraform apply
```

Para no crear EC2: `verify_ec2_enabled = false` en `terraform.tfvars`.  
Para IP manual: `verify_ssh_cidr_auto = false` y `verify_ssh_cidr_ipv4 = ["tu.ip/32"]`.  
Para no generar PEM: `verify_ec2_generate_ssh_key = false` y tu `verify_ec2_public_key` o `verify_ec2_existing_key_name`.

Tras el `apply`: `verification_ec2_public_ip`, `verification_ec2_private_key_path`.

## 2. Aprovisionar con Ansible

Desde la **raíz** del repo `hexaminer/`:

```bash
IP=$(./scripts/verification-ec2-ip.sh)
KEY=$(./scripts/verification-ec2-ssh-key.sh)
ansible-playbook -i "$IP," -u ec2-user --private-key "$KEY" ansible/playbooks/verify-ec2.yml
```

Si usas tu propia clave, sustituye `KEY` por la ruta a tu `.pem`.

El playbook instala utilidades base (`git`, …) y **Node.js 20** (NodeSource) sobre **Amazon Linux 2023**.

## 3. Apagar o eliminar la instancia

- **Solo parar** (conserva disco/EBS; sigue coste mínimo del volumen): consola EC2 o  
  `aws ec2 stop-instances --instance-ids "$(terraform output -raw verification_ec2_instance_id)"`
- **Eliminar del todo:** en Terraform, pon `verify_ec2_enabled = false` y `terraform apply`, o `terraform destroy` si solo usaste este stack para la prueba.

## Nota sobre “LAMP”

Esta EC2 es **Linux** lista para **Node.js** (Next.js). Un servidor clásico **solo LAMP (PHP)** no ejecuta la app Next tal cual; si quieres Apache delante, suele usarse **Apache como proxy inverso** hacia `node` (documentación de despliegue de la app en `apps/web` cuando esté lista).

## Archivos

| Ruta | Uso |
|------|-----|
| `terraform/ec2_verification.tf` | Recurso EC2, SG, IAM (SSM), Key Pair opcional. |
| `terraform/variables_ec2_verification.tf` | Variables `verify_*`. |
| `ansible/playbooks/verify-ec2.yml` | Playbook base. |
| `scripts/verification-ec2-ip.sh` | IP pública de la EC2. |
| `scripts/verification-ec2-ssh-key.sh` | Ruta del `.pem` generado por Terraform. |
