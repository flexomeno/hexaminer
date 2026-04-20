import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse, parseJson } from "../lib/http";
import { ensureUserProfile, setUserFcmToken } from "../lib/dynamo";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";

type Body = { fcmToken?: string };

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const queryUserId = getUserIdFromQuery(event);
    const user = getUserIdentityFromEvent(event, queryUserId);
    const body = parseJson<Body>(event.body);
    const token = body?.fcmToken?.trim();
    if (!token) {
      return jsonResponse(400, { error: "fcmToken requerido" });
    }

    await ensureUserProfile(user);
    await setUserFcmToken({ userId: user.userId, token });

    return jsonResponse(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "registerFcmToken error";
    return jsonResponse(500, { error: message });
  }
}
