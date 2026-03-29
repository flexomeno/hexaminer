import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/http";
import { getUserIdentityFromEvent } from "../lib/userIdentity";
import {
  ensureUserProfile,
  evaluateShoppingList,
  getShoppingListItems,
  getUserScans,
} from "../lib/dynamo";
import { resolveRequestedUserId } from "../lib/userIdentity";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const identity = getUserIdentityFromEvent(event);
    const userId = resolveRequestedUserId(event, identity.userId) ?? identity.userId;
    const user = { ...identity, userId };
    await ensureUserProfile(user);

    const [scans, shoppingList] = await Promise.all([
      getUserScans(user.userId),
      getShoppingListItems(user.userId),
    ]);
    const shoppingSummary = evaluateShoppingList(shoppingList);

    return jsonResponse(200, {
      user,
      recentScans: scans,
      shoppingList,
      shoppingEvaluation: shoppingSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard error";
    return jsonResponse(500, { error: message });
  }
}
