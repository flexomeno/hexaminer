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
