import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { jsonResponse, parseJson } from "../lib/http";
import { getImageFromS3 } from "../lib/s3";
import { extractUidFromImages } from "../lib/imageIdentifier";
import { analyzeProductImagesWithOpenAI } from "../lib/openai";
import {
  ensureUserProfile,
  getProductByUid,
  putProductAnalysis,
  upsertUserScan,
} from "../lib/dynamo";
import { getUserIdentityFromEvent } from "../lib/userIdentity";

const MAX_IMAGES = 12;

type AnalyzeRequestBody = {
  imageKey?: string;
  imageKeys?: string[];
  userId?: string;
};

function isAllowedUploadKey(key: string): boolean {
  const k = key.trim();
  return (
    k.startsWith("uploads/") &&
    k.length > "uploads/".length &&
    !k.includes("..") &&
    k.length < 500
  );
}

function normalizeImageKeys(body: AnalyzeRequestBody): string[] | null {
  const fromArray =
    Array.isArray(body.imageKeys) && body.imageKeys.length > 0
      ? body.imageKeys.filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      : [];
  if (fromArray.length > 0) {
    return fromArray.map((k) => k.trim());
  }
  if (typeof body.imageKey === "string" && body.imageKey.trim().length > 0) {
    return [body.imageKey.trim()];
  }
  return null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = parseJson<AnalyzeRequestBody>(event.body) ?? {};
  const keys = normalizeImageKeys(body);

  if (!keys || keys.length === 0) {
    return jsonResponse(400, {
      error: "imageKey or non-empty imageKeys is required",
    });
  }

  if (keys.length > MAX_IMAGES) {
    return jsonResponse(400, { error: `At most ${MAX_IMAGES} images allowed` });
  }

  for (const k of keys) {
    if (!isAllowedUploadKey(k)) {
      return jsonResponse(400, { error: "Invalid image key" });
    }
  }

  try {
    const user = getUserIdentityFromEvent(event, body?.userId);
    await ensureUserProfile(user);

    const imageBuffers = await Promise.all(keys.map((k) => getImageFromS3(k)));
    const uid = await extractUidFromImages(imageBuffers, keys);

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

    const analysis = await analyzeProductImagesWithOpenAI(imageBuffers);
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
