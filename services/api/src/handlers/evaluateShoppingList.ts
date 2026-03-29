import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { jsonResponse } from "../lib/http";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";
import { evaluateShoppingList, getShoppingListItems } from "../lib/dynamo";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const identity = getUserIdentityFromEvent(event);
    const userId = getUserIdFromQuery(event) ?? identity.userId;
    const items = await getShoppingListItems(userId);
    const evaluation = evaluateShoppingList(items);

    return jsonResponse(200, {
      user_id: userId,
      shopping_items: items,
      evaluation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate shopping list";
    return jsonResponse(500, { error: message });
  }
};
