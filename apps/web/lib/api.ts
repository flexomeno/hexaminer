import { env } from "./config";
import type {
  AnalyzeJobPollResponse,
  DashboardResponse,
  ProductAnalysisResponse,
  ShoppingListEvaluation,
  StartAnalyzeJobResponse,
  UploadUrlResponse,
} from "@/types/domain";

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const fallback = await response.text();
    throw new Error(`HTTP ${response.status}: ${fallback}`);
  }
  return (await response.json()) as T;
}

type OptionalAuth = {
  userId?: string;
};

function withOptionalUserId<T extends Record<string, unknown>>(
  payload: T,
  auth?: OptionalAuth,
): T & { userId?: string } {
  if (!auth?.userId) return payload;
  return { ...payload, userId: auth.userId };
}

export async function requestUploadUrl(
  payload: { key?: string; fileName?: string; contentType?: string },
) {
  const response = await fetch(`${env.apiBaseUrl}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return safeJson<UploadUrlResponse>(response);
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  body: Blob | Uint8Array,
  contentType: string,
) {
  const normalizedBody = body instanceof Uint8Array ? Buffer.from(body) : body;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType || "application/octet-stream" },
    body: normalizedBody,
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed with status ${response.status}`);
  }
}

export async function analyzeProduct(
  payload: { imageKey?: string; imageKeys?: string[] },
  auth?: OptionalAuth,
) {
  const response = await fetch(`${env.apiBaseUrl}/analyze-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId(payload, auth)),
  });
  return safeJson<ProductAnalysisResponse>(response);
}

/** Encola análisis en segundo plano (202). El resultado aparece en historial / dashboard. */
export async function startAnalyzeJob(
  payload: { imageKey?: string; imageKeys?: string[] },
  auth?: OptionalAuth,
) {
  const response = await fetch(`${env.apiBaseUrl}/analyze-product/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId(payload, auth)),
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`HTTP ${response.status}: invalid JSON`);
  }
  if (response.status === 202 && data && typeof data === "object" && "jobId" in data) {
    return data as StartAnalyzeJobResponse;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  throw new Error("Unexpected response from analyze-product/start");
}

export async function getAnalyzeJob(jobId: string, auth?: OptionalAuth) {
  const params = new URLSearchParams({ jobId });
  if (auth?.userId) {
    params.set("userId", auth.userId);
  }
  const response = await fetch(
    `${env.apiBaseUrl}/analyze-product/job?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
  );
  return safeJson<AnalyzeJobPollResponse>(response);
}

export async function addItemToShoppingList(
  payload: { uid: string },
  auth?: OptionalAuth,
) {
  const response = await fetch(`${env.apiBaseUrl}/shopping-list/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId(payload, auth)),
  });
  return safeJson<{ item: { productUid: string } }>(response);
}

export async function evaluateShoppingList(auth?: OptionalAuth) {
  const response = await fetch(`${env.apiBaseUrl}/shopping-list/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId({}, auth)),
  });
  return safeJson<{
    user_id: string;
    shopping_items: Array<{
      productUid: string;
      productName: string;
      score: number;
      endocrineRiskCount: number;
      addedAt: string;
    }>;
    evaluation: ShoppingListEvaluation;
  }>(response);
}

/** POST /shopping-list/reset. Por defecto en API solo vacía la canasta; `recentScans: true` borra historial. */
export async function resetUserSession(
  payload: { shoppingList?: boolean; recentScans?: boolean } = {},
  auth?: OptionalAuth,
) {
  const response = await fetch(`${env.apiBaseUrl}/shopping-list/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId(payload, auth)),
  });
  return safeJson<{
    cleared: { shoppingItems: number; recentScans: number };
  }>(response);
}

export async function getDashboard(auth?: OptionalAuth) {
  const query = auth?.userId
    ? `?userId=${encodeURIComponent(auth.userId)}`
    : "";
  const response = await fetch(`${env.apiBaseUrl}/dashboard${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  return safeJson<DashboardResponse>(response);
}
