import { getImageFromS3 } from "./s3";
import { extractUidFromImages } from "./imageIdentifier";
import { analyzeProductImagesWithOpenAI } from "./openai";
import { getProductByUid, putProductAnalysis, upsertUserScan } from "./dynamo";
import { mergeAndSortChemicalRows } from "./mergeChemicalAnalysis";
import type { ProductAiAnalysis, ProductRecord } from "../types/domain";

export async function runAnalyzeProductPipeline(params: {
  imageKeys: string[];
  userId: string;
}): Promise<{ source: "cache" | "openai"; uid: string; product: ProductRecord }> {
  const { imageKeys, userId } = params;
  const imageBuffers = await Promise.all(imageKeys.map((k) => getImageFromS3(k)));
  const uid = await extractUidFromImages(imageBuffers, imageKeys);

  const cached = await getProductByUid(uid);
  if (cached) {
    await upsertUserScan({
      userId,
      productUid: cached.uid,
      productName: cached.name,
      score: cached.score,
    });
    return { source: "cache", uid, product: cached };
  }

  const analysis = await analyzeProductImagesWithOpenAI(imageBuffers);
  const mergedRows = await mergeAndSortChemicalRows(analysis.analisis_quimico ?? []);
  const mergedAnalysis: ProductAiAnalysis = {
    ...analysis,
    analisis_quimico: mergedRows,
  };
  const saved = await putProductAnalysis(uid, mergedAnalysis);

  await upsertUserScan({
    userId,
    productUid: saved.uid,
    productName: saved.name,
    score: saved.score,
  });

  return { source: "openai", uid, product: saved };
}
