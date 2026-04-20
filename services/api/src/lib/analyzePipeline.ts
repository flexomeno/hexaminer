import { getImageFromS3 } from "./s3";
import { extractUidFromImages } from "./imageIdentifier";
import { analyzeProductImagesWithOpenAI } from "./openai";
import { getProductByUid, putProductAnalysis, upsertUserScan } from "./dynamo";
import { mergeAndSortChemicalRows } from "./mergeChemicalAnalysis";
import type { ProductAiAnalysis, ProductRecord } from "../types/domain";
import { createHash } from "node:crypto";

const BARCODE_UID_REGEX = /^\d{8,14}$/;

function normalizeTextForUid(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function buildCanonicalUid(detectedUid: string, analysis: ProductAiAnalysis): string {
  // Si tenemos barcode real, ese es el identificador canónico.
  if (BARCODE_UID_REGEX.test(detectedUid)) return detectedUid;

  const normalizedBrand = normalizeTextForUid(analysis.producto.marca);
  const normalizedName = normalizeTextForUid(analysis.producto.nombre);
  const normalizedCategory = normalizeTextForUid(analysis.producto.categoria);
  const fingerprint = `${normalizedBrand}|${normalizedName}|${normalizedCategory}`;
  if (!normalizedBrand && !normalizedName) {
    return detectedUid;
  }
  const hash = createHash("sha256").update(fingerprint, "utf8").digest("hex").slice(0, 24);
  return `NAME#${hash}`;
}

export async function runAnalyzeProductPipeline(params: {
  imageKeys: string[];
  userId: string;
}): Promise<{ source: "cache" | "openai"; uid: string; product: ProductRecord }> {
  const { imageKeys, userId } = params;
  const imageBuffers = await Promise.all(imageKeys.map((k) => getImageFromS3(k)));
  const detectedUid = await extractUidFromImages(imageBuffers, imageKeys);

  const cached = await getProductByUid(detectedUid);
  if (cached) {
    await upsertUserScan({
      userId,
      productUid: cached.uid,
      productName: cached.name,
      score: cached.score,
      category: cached.category,
    });
    return { source: "cache", uid: cached.uid, product: cached };
  }

  const analysis = await analyzeProductImagesWithOpenAI(imageBuffers);
  const mergedRows = await mergeAndSortChemicalRows(analysis.analisis_quimico ?? []);
  const mergedAnalysis: ProductAiAnalysis = {
    ...analysis,
    analisis_quimico: mergedRows,
  };
  const canonicalUid = buildCanonicalUid(detectedUid, mergedAnalysis);
  const canonicalCached =
    canonicalUid === detectedUid ? null : await getProductByUid(canonicalUid);

  if (canonicalCached) {
    await upsertUserScan({
      userId,
      productUid: canonicalCached.uid,
      productName: canonicalCached.name,
      score: canonicalCached.score,
      category: canonicalCached.category,
    });
    return { source: "cache", uid: canonicalCached.uid, product: canonicalCached };
  }

  const saved = await putProductAnalysis(canonicalUid, mergedAnalysis);

  await upsertUserScan({
    userId,
    productUid: saved.uid,
    productName: saved.name,
    score: saved.score,
    category: saved.category,
  });

  return { source: "openai", uid: saved.uid, product: saved };
}
