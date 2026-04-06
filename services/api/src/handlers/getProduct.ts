import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ensureUserProfile, getProductByUid } from "../lib/dynamo";
import { jsonResponse } from "../lib/http";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const uid = event.queryStringParameters?.uid?.trim() ?? "";
  if (!uid) {
    return jsonResponse(400, { error: "uid query parameter is required" });
  }

  try {
    const queryUserId = getUserIdFromQuery(event);
    const user = getUserIdentityFromEvent(event, queryUserId);
    await ensureUserProfile(user);

    const product = await getProductByUid(uid);
    if (!product) {
      return jsonResponse(404, { error: "Product not found" });
    }

    return jsonResponse(200, { product });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
