output "api_base_url" {
  description = "URL base del HTTP API (añadir rutas /upload-url, /analyze-product, etc.)"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.products.name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "aws_region" {
  value = var.aws_region
}

# --- EC2 de verificación (solo si verify_ec2_enabled = true) ---

output "verification_ec2_public_ip" {
  description = "IP pública de la EC2 de verificación (Ansible inventory)."
  value       = try(aws_instance.verification[0].public_ip, null)
}

output "verification_ec2_public_dns" {
  description = "DNS público de la EC2 de verificación."
  value       = try(aws_instance.verification[0].public_dns, null)
}

output "verification_ec2_instance_id" {
  description = "ID de instancia (consola AWS / aws ec2 stop-instances)."
  value       = try(aws_instance.verification[0].id, null)
}

output "verification_ec2_ssh_user" {
  description = "Usuario SSH para Amazon Linux 2023."
  value       = var.verify_ec2_enabled ? "ec2-user" : null
}

output "verification_ssh_allowed_cidrs" {
  description = "CIDRs IPv4 abiertos al puerto 22 (autodetectados con ipify o los de verify_ssh_cidr_ipv4)."
  value       = length(local.verify_ssh_cidrs) > 0 ? local.verify_ssh_cidrs : null
}

output "verification_ssh_detected_public_ip" {
  description = "IP pública usada para el /32 cuando verify_ssh_cidr_auto = true (salida de ipify en apply)."
  value       = length(data.http.runner_public_ip) > 0 ? chomp(data.http.runner_public_ip[0].response_body) : null
}

output "verification_ec2_private_key_path" {
  description = "Ruta absoluta de la clave privada generada (permiso 0600). Null si usas tu propia clave."
  value       = length(local_sensitive_file.verification_ec2_key) > 0 ? abspath(local_sensitive_file.verification_ec2_key[0].filename) : null
}
