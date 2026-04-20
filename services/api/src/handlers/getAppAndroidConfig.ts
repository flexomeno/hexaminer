import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/http";

const DEFAULT_PLAY =
  "https://play.google.com/store/apps/details?id=com.hexaminer.app";

/**
 * Configuración pública para la app Android (sin auth).
 * Si `latestVersionCode` > 0 y es mayor que el versionCode del cliente, la app muestra aviso de actualización.
 */
export async function handler(_event: APIGatewayProxyEventV2) {
  const latestCodeRaw = parseInt(
    process.env.ANDROID_LATEST_VERSION_CODE?.trim() ?? "0",
    10,
  );
  const latestVersionCode =
    Number.isFinite(latestCodeRaw) && latestCodeRaw > 0 ? latestCodeRaw : 0;

  const latestVersionName =
    process.env.ANDROID_LATEST_VERSION_NAME?.trim() || null;

  const playStoreUrl =
    process.env.ANDROID_PLAY_STORE_URL?.trim() || DEFAULT_PLAY;

  return jsonResponse(200, {
    latestVersionCode,
    latestVersionName,
    playStoreUrl,
  });
}
