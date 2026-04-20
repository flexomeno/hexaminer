/**
 * Genera bundles esbuild en terraform/.build/lambda/<nombre>/index.js
 * para empaquetado con Terraform (archive_file).
 */
import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(__dirname, "..");
// Repo: hexaminer/services/api -> hexaminer/terraform/.build/...
const outRoot = join(apiRoot, "..", "..", "terraform", ".build", "lambda");

const handlers = [
  { name: "analyzeProduct", entry: "src/handlers/analyzeProduct.ts" },
  { name: "startAnalyzeJob", entry: "src/handlers/startAnalyzeJob.ts" },
  { name: "getAnalyzeJob", entry: "src/handlers/getAnalyzeJob.ts" },
  { name: "processAnalysisJob", entry: "src/handlers/processAnalysisJob.ts" },
  { name: "getUploadUrl", entry: "src/handlers/getUploadUrl.ts" },
  { name: "evaluateShoppingList", entry: "src/handlers/evaluateShoppingList.ts" },
  { name: "getUserDashboard", entry: "src/handlers/getUserDashboard.ts" },
  { name: "getProduct", entry: "src/handlers/getProduct.ts" },
  { name: "addShoppingListItem", entry: "src/handlers/addShoppingListItem.ts" },
  { name: "resetUserSession", entry: "src/handlers/resetUserSession.ts" },
  { name: "regradeProducts", entry: "src/handlers/regradeProducts.ts" },
  { name: "getAppAndroidConfig", entry: "src/handlers/getAppAndroidConfig.ts" },
  { name: "registerFcmToken", entry: "src/handlers/registerFcmToken.ts" },
  { name: "sendPushNotification", entry: "src/handlers/sendPushNotification.ts" },
];

for (const h of handlers) {
  const outdir = join(outRoot, h.name);
  mkdirSync(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [join(apiRoot, h.entry)],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: join(outdir, "index.js"),
    external: ["aws-sdk"],
    sourcemap: true,
    logLevel: "info",
  });
}

console.log(`OK: ${handlers.length} Lambdas en ${outRoot}`);
