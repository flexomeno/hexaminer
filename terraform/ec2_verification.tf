# EC2 de verificación: IP SSH autodetectada (opcional), clave generada por Terraform (opcional).

data "http" "runner_public_ip" {
  count = var.verify_ec2_enabled && var.verify_ssh_cidr_auto ? 1 : 0
  url   = "https://api.ipify.org"
}

locals {
  verify_ssh_cidrs = var.verify_ec2_enabled ? (
    var.verify_ssh_cidr_auto ? ["${chomp(data.http.runner_public_ip[0].response_body)}/32"] : var.verify_ssh_cidr_ipv4
  ) : []
}

data "aws_vpc" "default" {
  count   = var.verify_ec2_enabled ? 1 : 0
  default = true
}

# Subnets “default” por AZ en la VPC por defecto (lo habitual en cuentas AWS).
data "aws_subnets" "default_for_az" {
  count = var.verify_ec2_enabled ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# Fallback: cualquier subnet available (por si borraron las default pero quedó otra).
data "aws_subnets" "any_available" {
  count = var.verify_ec2_enabled ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}

locals {
  subnets_in_default_vpc = var.verify_ec2_enabled ? (
    length(data.aws_subnets.default_for_az[0].ids) > 0 ? data.aws_subnets.default_for_az[0].ids : data.aws_subnets.any_available[0].ids
  ) : []
  verification_subnet_id = var.verify_ec2_enabled ? (
    var.verify_ec2_subnet_id != "" ? var.verify_ec2_subnet_id : (
      length(local.subnets_in_default_vpc) > 0 ? local.subnets_in_default_vpc[0] : null
    )
  ) : null
}

data "aws_ami" "al2023" {
  count       = var.verify_ec2_enabled ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "tls_private_key" "verification_ec2" {
  count     = var.verify_ec2_enabled && var.verify_ec2_generate_ssh_key ? 1 : 0
  algorithm = "ED25519"
}

resource "null_resource" "verification_ssh_dir" {
  count = var.verify_ec2_enabled && var.verify_ec2_generate_ssh_key ? 1 : 0

  provisioner "local-exec" {
    command = "mkdir -p '${abspath(path.module)}/.ssh'"
  }
}

resource "aws_key_pair" "verification_ec2" {
  count      = var.verify_ec2_enabled && (var.verify_ec2_generate_ssh_key || var.verify_ec2_public_key != "") ? 1 : 0
  key_name   = "${local.name_prefix}-verification"
  public_key = var.verify_ec2_generate_ssh_key ? tls_private_key.verification_ec2[0].public_key_openssh : var.verify_ec2_public_key
}

locals {
  verification_key_name = var.verify_ec2_enabled ? (
    (var.verify_ec2_generate_ssh_key || var.verify_ec2_public_key != "") ? aws_key_pair.verification_ec2[0].key_name : var.verify_ec2_existing_key_name
  ) : null
}

resource "local_sensitive_file" "verification_ec2_key" {
  count           = var.verify_ec2_enabled && var.verify_ec2_generate_ssh_key ? 1 : 0
  filename        = "${path.module}/.ssh/verification_ec2.pem"
  content         = tls_private_key.verification_ec2[0].private_key_openssh
  file_permission = "0600"

  depends_on = [null_resource.verification_ssh_dir]
}

resource "aws_security_group" "verification_ec2" {
  count       = var.verify_ec2_enabled ? 1 : 0
  name        = "${local.name_prefix}-verification-ec2"
  description = "SSH desde CIDRs detectados o definidos; salida libre."
  vpc_id      = data.aws_vpc.default[0].id

  dynamic "ingress" {
    for_each = local.verify_ssh_cidrs
    content {
      description = "SSH (Terraform/Ansible)"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "verification_ec2" {
  count = var.verify_ec2_enabled ? 1 : 0
  name  = "${local.name_prefix}-verification-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "verification_ec2_ssm" {
  count      = var.verify_ec2_enabled ? 1 : 0
  role       = aws_iam_role.verification_ec2[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "verification_ec2" {
  count = var.verify_ec2_enabled ? 1 : 0
  name  = "${local.name_prefix}-verification-ec2"
  role  = aws_iam_role.verification_ec2[0].name
}

resource "aws_instance" "verification" {
  count                       = var.verify_ec2_enabled ? 1 : 0
  ami                         = data.aws_ami.al2023[0].id
  instance_type               = var.verify_ec2_instance_type
  subnet_id                   = local.verification_subnet_id
  vpc_security_group_ids      = [aws_security_group.verification_ec2[0].id]
  associate_public_ip_address = var.verify_ec2_associate_public_ip
  key_name                    = local.verification_key_name
  iam_instance_profile        = aws_iam_instance_profile.verification_ec2[0].name

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size           = 30 # AL2023 snapshot exige ≥30 GiB
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name        = "${local.name_prefix}-verification"
    Purpose     = "ephemeral-verification"
    Ansible     = "true"
    Environment = var.stage
  }

  lifecycle {
    precondition {
      condition     = !var.verify_ec2_enabled || try(local.verification_key_name, "") != ""
      error_message = "Con verify_ec2_enabled=true: activa verify_ec2_generate_ssh_key, o define verify_ec2_public_key, o verify_ec2_existing_key_name."
    }
    precondition {
      condition     = !var.verify_ec2_enabled || length(local.verify_ssh_cidrs) > 0
      error_message = "CIDRs SSH vacíos: con verify_ssh_cidr_auto=true hace falta red saliente a api.ipify.org; si falla, pon verify_ssh_cidr_auto=false y verify_ssh_cidr_ipv4."
    }
    precondition {
      condition     = !var.verify_ec2_enabled || local.verification_subnet_id != null
      error_message = "La VPC por defecto no tiene subnets. En AWS: VPC → Create default VPC/subnets, o crea una subnet pública y pásala con verify_ec2_subnet_id."
    }
  }
}

resource "aws_iam_role_policy" "verification_ec2_dynamo_read" {
  count = var.verify_ec2_enabled ? 1 : 0
  name  = "${local.name_prefix}-verification-dynamo-read"
  role  = aws_iam_role.verification_ec2[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SingleTableRead"
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:GetItem",
        ]
        Resource = aws_dynamodb_table.products.arn
      }
    ]
  })
}
