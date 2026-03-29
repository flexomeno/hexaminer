import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { jsonResponse, parseJson } from "../lib/http";
import { getImageFromS3 } from "../lib/s3";
import { extractUidFromImage } from "../lib/imageIdentifier";
import { analyzeProductImageWithOpenAI } from "../lib/openai";
import {
  ensureUserProfile,
  getProductByUid,
  putProductAnalysis,
  upsertUserScan,
} from "../lib/dynamo";
import { getUserIdentityFromEvent } from "../lib/userIdentity";

type AnalyzeRequestBody = {
  imageKey?: string;
  userId?: string;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = parseJson<AnalyzeRequestBody>(event.body);
  const imageKey = body?.imageKey;
  const requestedUserId = body?.userId?.trim();

  if (!imageKey) {
    return jsonResponse(400, { error: "imageKey is required" });
  }

  try {
    const user = requestedUserId
      ? { userId: requestedUserId }
      : getUserIdentityFromEvent(event);
    await ensureUserProfile(user);

    const imageBytes = await getImageFromS3(imageKey);
    const uid = await extractUidFromImage(imageBytes, imageKey);

    const cached = await getProductByUid(uid);
    if (cached) {
      await upsertUserScan({
        userId: user.userId,
        productUid: cached.uid,
        productName: cached.name,
        score: cached.score,
      });

      return jsonResponse(200, {
        source: "cache",
        uid,
        product: cached,
      });
    }

    const analysis = await analyzeProductImageWithOpenAI(imageBytes);
    const saved = await putProductAnalysis(uid, analysis);

    await upsertUserScan({
      userId: user.userId,
      productUid: saved.uid,
      productName: saved.name,
      score: saved.score,
    });

    return jsonResponse(200, {
      source: "openai",
      uid,
      product: saved,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to analyze product",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
