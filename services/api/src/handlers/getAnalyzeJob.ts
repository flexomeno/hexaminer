import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  ensureUserProfile,
  getAnalysisJobMeta,
  getProductByUid,
} from "../lib/dynamo";
import { jsonResponse } from "../lib/http";
import { getUserIdentityFromEvent, getUserIdFromQuery } from "../lib/userIdentity";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId =
    event.queryStringParameters?.jobId?.trim() ??
    event.queryStringParameters?.job_id?.trim() ??
    "";

  if (!jobId) {
    return jsonResponse(400, { error: "jobId query parameter is required" });
  }

  try {
    const queryUserId = getUserIdFromQuery(event);
    const user = getUserIdentityFromEvent(event, queryUserId);
    await ensureUserProfile(user);

    const meta = await getAnalysisJobMeta(jobId, user.userId);
    if (!meta) {
      return jsonResponse(404, { error: "Job not found" });
    }

    let product = null;
    if (meta.status === "COMPLETED" && meta.productUid) {
      product = await getProductByUid(meta.productUid);
    }

    return jsonResponse(200, {
      job: {
        jobId: meta.jobId,
        status: meta.status,
        productUid: meta.productUid,
        errorMessage: meta.errorMessage,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      },
      product,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to load job",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
