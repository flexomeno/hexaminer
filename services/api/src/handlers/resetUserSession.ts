import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { clearRecentScansForUser, clearShoppingListForUser } from "../lib/dynamo";
import { jsonResponse, parseJson } from "../lib/http";
import { getUserIdentityFromEvent } from "../lib/userIdentity";

type ResetBody = {
  userId?: string;
  /** Por defecto true. */
  shoppingList?: boolean;
  /**
   * Solo se borra historial si viene explícitamente true (la UI solo vacía la canasta).
   */
  recentScans?: boolean;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = parseJson<ResetBody>(event.body) ?? {};
  const user = getUserIdentityFromEvent(event, body.userId);
  const doShopping = body.shoppingList !== false;
  const doScans = body.recentScans === true;

  let shoppingItems = 0;
  let recentScans = 0;
  if (doShopping) {
    shoppingItems = await clearShoppingListForUser(user.userId);
  }
  if (doScans) {
    recentScans = await clearRecentScansForUser(user.userId);
  }

  return jsonResponse(200, {
    cleared: { shoppingItems, recentScans },
  });
};
