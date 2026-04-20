import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse, parseJson } from "../lib/http";
import { getUserFcmToken } from "../lib/dynamo";
import { sendFcmNotification } from "../lib/fcmSend";

type Body = {
  targetUserId?: string;
  title?: string;
  body?: string;
};

function headerSecret(event: APIGatewayProxyEventV2): string | undefined {
  const h = event.headers;
  if (!h) return undefined;
  const direct =
    h["x-hexaminer-push-secret"] ??
    h["X-Hexaminer-Push-Secret"] ??
    h["x-Hexaminer-Push-Secret"];
  return typeof direct === "string" ? direct.trim() : undefined;
}

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const expected = process.env.PUSH_NOTIFICATION_SECRET?.trim();
    if (!expected) {
      return jsonResponse(503, { error: "PUSH_NOTIFICATION_SECRET no configurado" });
    }
    const got = headerSecret(event);
    if (!got || got !== expected) {
      return jsonResponse(401, { error: "No autorizado" });
    }

    const json = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
    if (!json) {
      return jsonResponse(503, { error: "FCM_SERVICE_ACCOUNT_JSON no configurado" });
    }

    const body = parseJson<Body>(event.body);
    const targetUserId = body?.targetUserId?.trim();
    const title = body?.title?.trim() ?? "Hexaminer";
    const text = body?.body?.trim();
    if (!targetUserId || !text) {
      return jsonResponse(400, { error: "targetUserId y body son requeridos" });
    }

    const token = await getUserFcmToken(targetUserId);
    if (!token) {
      return jsonResponse(404, { error: "Usuario sin token FCM registrado" });
    }

    await sendFcmNotification({
      serviceAccountJson: json,
      deviceToken: token,
      title,
      body: text,
    });

    return jsonResponse(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sendPushNotification error";
    return jsonResponse(500, { error: message });
  }
}
