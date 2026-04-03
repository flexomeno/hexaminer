locals {
  name_prefix = "${var.project_name}-${var.stage}"

  # Debe coincidir con carpetas generadas por scripts/bundle-lambda-terraform.mjs
  lambda_functions = {
    analyzeProduct = {
      route_key = "POST /analyze-product"
      timeout   = 30
      memory    = 1024
    }
    getUploadUrl = {
      route_key = "POST /upload-url"
      timeout   = 10
      memory    = 256
    }
    evaluateShoppingList = {
      route_key = "POST /shopping-list/evaluate"
      timeout   = 10
      memory    = 256
    }
    getUserDashboard = {
      route_key = "GET /dashboard"
      timeout   = 10
      memory    = 256
    }
    addShoppingListItem = {
      route_key = "POST /shopping-list/items"
      timeout   = 10
      memory    = 256
    }
  }
}
