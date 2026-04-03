variable "aws_region" {
  type        = string
  description = "Región AWS (ej. us-east-1)"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Prefijo de nombres de recursos (coincide con serverless service)"
  default     = "product-analysis-api"
}

variable "stage" {
  type        = string
  description = "Entorno (dev, staging, prod)"
  default     = "dev"
}

variable "openaikey" {
  type        = string
  description = "Clave OpenAI. Terraform la lee desde la variable de entorno TF_VAR_openaikey (recomendado). Vacío = sin clave en Lambda (falla /analyze-product)."
  sensitive   = true
  default     = ""
}

variable "openai_model" {
  type        = string
  description = "Modelo OpenAI para visión"
  default     = "gpt-4o"
}

variable "default_tags" {
  type        = map(string)
  description = "Tags por defecto en recursos compatibles"
  default     = {}
}
