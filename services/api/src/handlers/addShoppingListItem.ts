import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { addShoppingListItem, getProductByUid } from "../lib/dynamo";
import { jsonResponse, parseJson } from "../lib/http";
import { getUserIdentityFromEvent } from "../lib/userIdentity";

type AddShoppingListItemRequest = {
  uid?: string;
  userId?: string;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = parseJson<AddShoppingListItemRequest>(event.body);
  if (!body?.uid) {
    return jsonResponse(400, { message: "uid is required" });
  }

  const user = getUserIdentityFromEvent(event, body?.userId);
  const product = await getProductByUid(body.uid);
  if (!product) {
    return jsonResponse(404, { message: "Product not found" });
  }

  const item = await addShoppingListItem({
    userId: user.userId,
    product,
  });

  return jsonResponse(200, { item });
};
