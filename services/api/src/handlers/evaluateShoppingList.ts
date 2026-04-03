import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { jsonResponse, parseJson } from "../lib/http";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";
import { evaluateShoppingList, getShoppingListItems } from "../lib/dynamo";

type EvaluateBody = { userId?: string };

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = parseJson<EvaluateBody>(event.body);
    const explicitUserId = getUserIdFromQuery(event) ?? body?.userId;
    const user = getUserIdentityFromEvent(event, explicitUserId);
    const items = await getShoppingListItems(user.userId);
    const evaluation = evaluateShoppingList(items);

    return jsonResponse(200, {
      user_id: user.userId,
      shopping_items: items,
      evaluation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate shopping list";
    return jsonResponse(500, { error: message });
  }
};
