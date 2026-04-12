# EC2 de verificación (Next.js / Ansible). Por defecto activa: pon verify_ec2_enabled = false en tfvars si no la quieres.

variable "verify_ec2_enabled" {
  type        = bool
  description = "Si true, crea la EC2 de verificación. Pon false en terraform.tfvars para desactivarla y ahorrar coste."
  default     = true
}

variable "verify_ssh_cidr_auto" {
  type        = bool
  description = "Si true, la IP permitida para SSH es la del equipo que ejecuta terraform apply (consulta api.ipify.org). En CI suele ser la IP del runner, no la tuya: entonces pon false y usa verify_ssh_cidr_ipv4."
  default     = true
}

variable "verify_ssh_cidr_ipv4" {
  type        = list(string)
  description = "CIDRs para SSH (22) cuando verify_ssh_cidr_auto = false, p. ej. [\"203.0.113.10/32\"]. Ignorado si verify_ssh_cidr_auto = true."
  default     = []
}

variable "verify_ec2_generate_ssh_key" {
  type        = bool
  description = "Si true, Terraform genera un par ED25519, sube la pública a AWS y guarda la privada en terraform/.ssh/verification_ec2.pem (gitignored)."
  default     = true
}

variable "verify_ec2_public_key" {
  type        = string
  description = "Solo si verify_ec2_generate_ssh_key = false: contenido de tu clave pública SSH."
  sensitive   = true
  default     = ""
}

variable "verify_ec2_existing_key_name" {
  type        = string
  description = "Solo si verify_ec2_generate_ssh_key = false y no usas verify_ec2_public_key: nombre de un Key Pair ya existente en la región."
  default     = ""
}

variable "verify_ec2_instance_type" {
  type        = string
  description = "Tipo de instancia (ej. t3.micro)."
  default     = "t3.micro"
}

variable "verify_ec2_associate_public_ip" {
  type        = bool
  description = "Asociar IP pública (necesario para SSH/Ansible desde tu red salvo túnel/VPN)."
  default     = true
}

variable "verify_ec2_subnet_id" {
  type        = string
  description = "Subnet pública (o con ruta a IGW) para lanzar la EC2. Si vacío, Terraform usa subnets default-for-az de la VPC por defecto y, si no hay, cualquier subnet available en esa VPC."
  default     = ""
}
