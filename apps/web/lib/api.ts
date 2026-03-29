import { env } from "./config";
import type {
  ProductAnalysisResponse,
  DashboardResponse,
  ShoppingListEvaluation,
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
  payload: { imageKey: string },
  auth?: OptionalAuth,
) {
  const response = await fetch(`${env.apiBaseUrl}/analyze-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withOptionalUserId(payload, auth)),
  });
  return safeJson<ProductAnalysisResponse>(response);
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
