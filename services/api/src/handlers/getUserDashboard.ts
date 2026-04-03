import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/http";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";
import {
  ensureUserProfile,
  evaluateShoppingList,
  getShoppingListItems,
  getUserScans,
} from "../lib/dynamo";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const queryUserId = getUserIdFromQuery(event);
    const user = getUserIdentityFromEvent(event, queryUserId);
    await ensureUserProfile(user);

    const [scans, shoppingList] = await Promise.all([
      getUserScans(user.userId),
      getShoppingListItems(user.userId),
    ]);
    const shoppingSummary = evaluateShoppingList(shoppingList);

    return jsonResponse(200, {
      user,
      recent_scans: scans,
      shopping_list: shoppingList,
      shopping_list_summary: shoppingSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard error";
    return jsonResponse(500, { error: message });
  }
}
