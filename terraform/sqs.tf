resource "aws_sqs_queue" "analyze_jobs_dlq" {
  name = "${local.name_prefix}-analyze-jobs-dlq"
}

resource "aws_sqs_queue" "analyze_jobs" {
  name                       = "${local.name_prefix}-analyze-jobs"
  visibility_timeout_seconds = 180
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.analyze_jobs_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_lambda_event_source_mapping" "analyze_jobs" {
  event_source_arn = aws_sqs_queue.analyze_jobs.arn
  function_name    = aws_lambda_function.handlers["processAnalysisJob"].arn
  batch_size       = 1
  enabled          = true
}
