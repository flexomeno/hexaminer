locals {
  name_prefix = "${var.project_name}-${var.stage}"

  # Debe coincidir con carpetas generadas por scripts/bundle-lambda-terraform.mjs
  # route_key null = Lambda sin ruta HTTP (p. ej. worker SQS).
  lambda_functions = {
    analyzeProduct = {
      route_key = "POST /analyze-product"
      timeout   = 120
      memory    = 2048
      extra_env = {}
    }
    startAnalyzeJob = {
      route_key = "POST /analyze-product/start"
      timeout   = 30
      memory    = 256
      extra_env = {
        ANALYZE_JOBS_QUEUE_URL = aws_sqs_queue.analyze_jobs.url
      }
    }
    getAnalyzeJob = {
      route_key = "GET /analyze-product/job"
      timeout   = 15
      memory    = 256
      extra_env = {}
    }
    processAnalysisJob = {
      route_key = null
      timeout   = 120
      memory    = 2048
      extra_env = {}
    }
    getUploadUrl = {
      route_key = "POST /upload-url"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    evaluateShoppingList = {
      route_key = "POST /shopping-list/evaluate"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    getUserDashboard = {
      route_key = "GET /dashboard"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    getProduct = {
      route_key = "GET /product"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    addShoppingListItem = {
      route_key = "POST /shopping-list/items"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    resetUserSession = {
      route_key = "POST /shopping-list/reset"
      timeout   = 30
      memory    = 256
      extra_env = {}
    }
    getAppAndroidConfig = {
      route_key = "GET /app/android-config"
      timeout   = 5
      memory    = 256
      extra_env = {
        ANDROID_LATEST_VERSION_CODE = "0"
        ANDROID_LATEST_VERSION_NAME = ""
        ANDROID_PLAY_STORE_URL      = ""
      }
    }
    registerFcmToken = {
      route_key = "POST /user/fcm-token"
      timeout   = 10
      memory    = 256
      extra_env = {}
    }
    sendPushNotification = {
      route_key = "POST /notifications/send"
      timeout   = 30
      memory    = 256
      extra_env = {
        FCM_SERVICE_ACCOUNT_JSON = ""
        PUSH_NOTIFICATION_SECRET = ""
      }
    }
    # Sin ruta HTTP: invocar con aws lambda invoke (evita abuso de OpenAI en público).
    regradeProducts = {
      route_key = null
      timeout   = 300
      memory    = 1024
      extra_env = {
        REGRADE_DELAY_MS = "1500"
      }
    }
  }

  lambda_http_functions = {
    for k, v in local.lambda_functions : k => v if v.route_key != null
  }
}
