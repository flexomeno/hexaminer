import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createUploadUrl } from "../lib/s3";
import { jsonResponse, parseJson } from "../lib/http";

type UploadUrlRequest = {
  fileName?: string;
  contentType?: string;
};

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = parseJson<UploadUrlRequest>(event.body);
  const contentType = body?.contentType ?? "image/jpeg";

  if (!allowedContentTypes.has(contentType)) {
    return jsonResponse(400, {
      message: "Unsupported content type",
      accepted: Array.from(allowedContentTypes),
    });
  }

  const safeFileName = (body?.fileName ?? "capture.jpg")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 120);
  const key = `uploads/${Date.now()}-${safeFileName}`;
  const uploadUrl = await createUploadUrl(key, contentType);

  return jsonResponse(200, { key, uploadUrl, contentType });
};
