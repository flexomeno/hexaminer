data "archive_file" "lambda" {
  for_each = local.lambda_functions

  type        = "zip"
  source_dir  = "${path.module}/.build/lambda/${each.key}"
  output_path = "${path.module}/.build/zips/${each.key}.zip"
}

resource "aws_lambda_function" "handlers" {
  for_each = local.lambda_functions

  function_name = "${local.name_prefix}-${each.key}"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = each.value.timeout
  memory_size   = each.value.memory

  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256

  environment {
    variables = merge(
      {
        TABLE_NAME     = aws_dynamodb_table.products.name
        BUCKET_NAME    = aws_s3_bucket.uploads.id
        OPENAI_API_KEY = var.openaikey
        OPENAI_MODEL   = var.openai_model
      },
      each.value.extra_env,
    )
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]
}
