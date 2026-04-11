import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from "aws-lambda";
import {
  buildPriorAnalysisFromProfile,
  getProductProfileForRegrade,
  putProductAnalysis,
  scanProductProfilePage,
} from "../lib/dynamo";
import { jsonResponse, parseJson } from "../lib/http";
import { mergeAndSortChemicalRows } from "../lib/mergeChemicalAnalysis";
import { reanalyzeProductFromPriorAnalysis } from "../lib/openai";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ResumeState = {
  exclusiveStartKey?: Record<string, unknown>;
  skipInPage: number;
};

type RegradePayload = {
  dryRun?: boolean;
  /** Si se indica, solo este uid (ignora scan y resume). */
  onlyUid?: string;
  /** Productos a re-evaluar en esta invocación (1–25). */
  maxProducts?: number;
  /** Tamaño de segmento de Scan en Dynamo (ítems leídos antes del filtro). */
  scanSegmentLimit?: number;
  /** Pausa en ms entre llamadas OpenAI (rate limits). */
  delayMs?: number;
  resume?: ResumeState;
};

function parsePayload(event: unknown): RegradePayload {
  if (event && typeof event === "object") {
    const e = event as Record<string, unknown>;
    if (typeof e.body === "string") {
      return (parseJson<RegradePayload>(e.body) ?? {}) as RegradePayload;
    }
    return e as RegradePayload;
  }
  return {};
}

function isHttpEvent(event: unknown): event is APIGatewayProxyEventV2 {
  return (
    event !== null &&
    typeof event === "object" &&
    "requestContext" in event &&
    typeof (event as APIGatewayProxyEventV2).requestContext === "object"
  );
}

/**
 * Re-evalúa productos existentes con el prompt actual (solo texto + JSON previo).
 * Escribe en el mismo ítem PRODUCT#uid / SK PROFILE mediante putProductAnalysis (sin duplicar filas).
 *
 * Payload (invoke directo o body JSON en API):
 * - dryRun: si true, no escribe en Dynamo.
 * - maxProducts: cuántos productos procesar en esta invocación (default 5, max 25).
 * - scanSegmentLimit: default 100.
 * - delayMs: pausa entre productos (default env REGRADE_DELAY_MS o 1500).
 * - resume: { exclusiveStartKey, skipInPage } para continuar tras timeout o límite.
 */
export const handler: Handler = async (
  event: APIGatewayProxyEventV2 | RegradePayload,
): Promise<APIGatewayProxyResultV2 | Record<string, unknown>> => {
  const body = parsePayload(event);
  const dryRun = body.dryRun === true;
  const onlyUid =
    typeof body.onlyUid === "string" && body.onlyUid.trim().length > 0
      ? body.onlyUid.trim()
      : undefined;
  const maxProducts = Math.min(Math.max(Number(body.maxProducts) || 5, 1), 25);
  const scanLimit = Math.min(Math.max(Number(body.scanSegmentLimit) || 100, 20), 500);
  const envDelay = parseInt(process.env.REGRADE_DELAY_MS ?? "", 10);
  const delayMs = Math.min(
    Math.max(Number(body.delayMs) ?? (Number.isFinite(envDelay) ? envDelay : 1500), 0),
    10_000,
  );

  if (onlyUid) {
    const outSingle: {
      dryRun: boolean;
      onlyUid: string;
      updated: string[];
      skipped: { uid: string; reason: string }[];
      errors: { uid: string; error: string }[];
    } = {
      dryRun,
      onlyUid,
      updated: [],
      skipped: [],
      errors: [],
    };
    const row = await getProductProfileForRegrade(onlyUid);
    if (!row) {
      outSingle.skipped.push({ uid: onlyUid, reason: "not_found" });
    } else {
      const prior = buildPriorAnalysisFromProfile(row);
      if (!prior) {
        outSingle.skipped.push({ uid: onlyUid, reason: "no_analysis_data" });
      } else {
        try {
          const fresh = await reanalyzeProductFromPriorAnalysis(prior);
          const merged = await mergeAndSortChemicalRows(fresh.analisis_quimico ?? []);
          const finalAnalysis = { ...fresh, analisis_quimico: merged };
          if (!dryRun) {
            await putProductAnalysis(row.uid, finalAnalysis);
          }
          outSingle.updated.push(row.uid);
        } catch (err) {
          outSingle.errors.push({
            uid: row.uid,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    if (isHttpEvent(event)) {
      return jsonResponse(200, outSingle);
    }
    return outSingle;
  }

  let resume = body.resume;
  let pageKey = resume?.exclusiveStartKey;
  let skipInPage = resume?.skipInPage ?? 0;

  const out: {
    dryRun: boolean;
    updated: string[];
    skipped: { uid: string; reason: string }[];
    errors: { uid: string; error: string }[];
    resume?: ResumeState;
    lastEvaluatedKey?: Record<string, unknown>;
    finishedTable: boolean;
  } = {
    dryRun,
    updated: [],
    skipped: [],
    errors: [],
    finishedTable: false,
  };

  let processed = 0;
  let emptyStreak = 0;

  while (processed < maxProducts) {
    const pageStartKey = pageKey;
    const { items, lastEvaluatedKey } = await scanProductProfilePage({
      limit: scanLimit,
      exclusiveStartKey: pageKey,
    });

    if (items.length === 0) {
      emptyStreak++;
      if (emptyStreak > 500) {
        out.errors.push({
          uid: "_scan",
          error: "Demasiados segmentos de Scan sin resultados; revisa la tabla o los filtros.",
        });
        break;
      }
      pageKey = lastEvaluatedKey;
      if (!pageKey) {
        out.finishedTable = true;
        break;
      }
      skipInPage = 0;
      continue;
    }
    emptyStreak = 0;

    let idx = skipInPage;
    skipInPage = 0;

    for (; idx < items.length && processed < maxProducts; idx++) {
      const row = items[idx];
      const prior = buildPriorAnalysisFromProfile(row);
      if (!prior) {
        out.skipped.push({ uid: row.uid, reason: "no_analysis_data" });
        processed++;
        continue;
      }

      try {
        const fresh = await reanalyzeProductFromPriorAnalysis(prior);
        const merged = await mergeAndSortChemicalRows(fresh.analisis_quimico ?? []);
        const finalAnalysis = { ...fresh, analisis_quimico: merged };
        if (!dryRun) {
          await putProductAnalysis(row.uid, finalAnalysis);
        }
        out.updated.push(row.uid);
      } catch (err) {
        out.errors.push({
          uid: row.uid,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      processed++;
      if (delayMs > 0 && processed < maxProducts) {
        await sleep(delayMs);
      }
    }

    if (processed >= maxProducts && idx < items.length) {
      out.resume = {
        exclusiveStartKey: pageStartKey,
        skipInPage: idx,
      };
      out.lastEvaluatedKey = lastEvaluatedKey;
      break;
    }

    pageKey = lastEvaluatedKey;
    if (!pageKey) {
      out.finishedTable = true;
      break;
    }
  }

  if (!out.resume && !out.finishedTable && pageKey) {
    out.lastEvaluatedKey = pageKey;
  }

  if (isHttpEvent(event)) {
    return jsonResponse(200, out);
  }
  return out;
};
