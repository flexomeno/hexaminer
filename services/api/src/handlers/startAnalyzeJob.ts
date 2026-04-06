import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { requireAnalyzeJobsQueueUrl } from "../lib/config";
import {
  createAnalysisJobRecord,
  ensureUserProfile,
} from "../lib/dynamo";
import { getUserIdentityFromEvent } from "../lib/userIdentity";
import { jsonResponse, parseJson } from "../lib/http";

const MAX_IMAGES = 12;
const sqs = new SQSClient({});

type Body = {
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

function normalizeImageKeys(body: Body): string[] | null {
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
  const body = parseJson<Body>(event.body) ?? {};
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
    const queueUrl = requireAnalyzeJobsQueueUrl();
    const jobId = randomUUID();

    await createAnalysisJobRecord(jobId, user.userId, keys);

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          jobId,
          userId: user.userId,
          imageKeys: keys,
        }),
      }),
    );

    return jsonResponse(202, {
      jobId,
      status: "PENDING",
      message:
        "Análisis en cola. En unos segundos podrás ver el resultado en el historial (dashboard).",
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to start analysis job",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
