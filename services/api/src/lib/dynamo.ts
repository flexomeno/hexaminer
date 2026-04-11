import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";
import { config } from "./config";
import type {
  AnalysisJobRecord,
  AnalysisJobStatus,
  AnalysisJobSummary,
  ChemicalAnalysisItem,
  ProductAiAnalysis,
  ProductCategory,
  ProductRecord,
  ShoppingListEvaluation,
  ShoppingListItem,
  UserScanRecord,
} from "../types/domain";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

type ProductItem = {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: "PRODUCT";
  uid: string;
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  category: string;
  score: number;
  ingredients: string[];
  disruptors_summary: string;
  labor_ethics: string;
  endocrine_alerts: string[];
  health_alert: string;
  chemical_analysis: ProductAiAnalysis["analisis_quimico"];
  verdict: string;
  recommendation: string;
  analysis_raw?: ProductAiAnalysis;
  last_updated: string;
};

type UserScanItem = {
  PK: string;
  SK: string;
  entityType: "USER_SCAN";
  product_uid: string;
  product_name: string;
  score: number;
  scanned_at: string;
  product_category?: string;
};

function normalizeStoredCategory(raw: string | undefined): ProductCategory {
  if (raw === "Alimento" || raw === "Cosmético" || raw === "Aseo") return raw;
  return "Desconocido";
}

type ShoppingItem = {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: "SHOPPING_ITEM";
  product_uid: string;
  product_name: string;
  score: number;
  endocrine_risk_count: number;
  added_at: string;
};

const nowIso = () => new Date().toISOString();
const userPk = (userId: string) => `USER#${userId}`;

function productKey(uid: string) {
  return { PK: `PRODUCT#${uid}`, SK: "PROFILE" };
}

function toProductRecord(item: ProductItem): ProductRecord {
  const category: ProductCategory =
    item.category === "Alimento" ||
    item.category === "Cosmético" ||
    item.category === "Aseo"
      ? item.category
      : "Desconocido";

  return {
    uid: item.uid,
    id: item.id,
    barcode: item.barcode,
    name: item.name,
    brand: item.brand,
    category,
    ingredients: item.ingredients,
    score: item.score,
    disruptors_summary: item.disruptors_summary,
    labor_ethics: item.labor_ethics,
    endocrine_alerts: item.endocrine_alerts,
    health_alert: item.health_alert,
    chemical_analysis: item.chemical_analysis,
    verdict: item.verdict,
    recommendation: item.recommendation,
    last_updated: item.last_updated,
  };
}

/** Fila PROFILE de producto (para jobs batch como regrade). */
export type ScannedProductProfile = {
  uid: string;
  name: string;
  brand: string;
  category: string;
  score: number;
  chemical_analysis: ProductAiAnalysis["analisis_quimico"];
  endocrine_alerts: string[];
  health_alert: string;
  labor_ethics: string;
  verdict: string;
  recommendation: string;
  analysis_raw?: ProductAiAnalysis;
};

function mapProductItemToScannedProfile(item: ProductItem): ScannedProductProfile {
  return {
    uid: item.uid,
    name: item.name,
    brand: item.brand,
    category: item.category,
    score: item.score,
    chemical_analysis: item.chemical_analysis,
    endocrine_alerts: item.endocrine_alerts,
    health_alert: item.health_alert,
    labor_ethics: item.labor_ethics,
    verdict: item.verdict,
    recommendation: item.recommendation,
    analysis_raw: item.analysis_raw,
  };
}

/**
 * Una página de Scan sobre perfiles de producto (PK PRODUCT#, SK PROFILE).
 * `Limit` es de ítems evaluados por Dynamo antes del filtro; puede devolver pocos resultados.
 */
export async function scanProductProfilePage(params: {
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}): Promise<{
  items: ScannedProductProfile[];
  lastEvaluatedKey?: Record<string, unknown>;
}> {
  const result = await doc.send(
    new ScanCommand({
      TableName: config.tableName,
      FilterExpression: "entityType = :et AND SK = :sk",
      ExpressionAttributeValues: {
        ":et": "PRODUCT",
        ":sk": "PROFILE",
      },
      Limit: params.limit ?? 120,
      ExclusiveStartKey: params.exclusiveStartKey,
    }),
  );

  const items = (result.Items as ProductItem[] | undefined)?.map(mapProductItemToScannedProfile) ?? [];
  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export function buildPriorAnalysisFromProfile(row: ScannedProductProfile): ProductAiAnalysis | null {
  if (row.analysis_raw?.producto?.nombre) {
    return row.analysis_raw;
  }
  if (row.chemical_analysis?.length) {
    const cat = row.category;
    const categoria: ProductCategory =
      cat === "Alimento" || cat === "Cosmético" || cat === "Aseo" ? cat : "Desconocido";
    return {
      producto: {
        nombre: row.name,
        marca: row.brand,
        categoria,
        puntaje_global: row.score,
      },
      analisis_quimico: row.chemical_analysis,
      alertas: {
        endocrinas: row.endocrine_alerts ?? [],
        salud: row.health_alert ?? "",
        etica_laboral: row.labor_ethics ?? "",
      },
      veredicto: row.verdict,
      recomendacion: row.recommendation,
    };
  }
  return null;
}

export async function getProductByUid(uid: string): Promise<ProductRecord | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: config.tableName,
      Key: productKey(uid),
    }),
  );

  const item = result.Item as ProductItem | undefined;
  return item ? toProductRecord(item) : null;
}

/** Perfil almacenado para regrade (incluye analysis_raw si existe). */
export async function getProductProfileForRegrade(uid: string): Promise<ScannedProductProfile | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: config.tableName,
      Key: productKey(uid),
    }),
  );
  const item = result.Item as ProductItem | undefined;
  if (!item || item.entityType !== "PRODUCT") {
    return null;
  }
  return mapProductItemToScannedProfile(item);
}

export async function putProductAnalysis(
  uid: string,
  analysis: ProductAiAnalysis,
): Promise<ProductRecord> {
  const timestamp = nowIso();
  const ingredients = analysis.analisis_quimico.map((i) => i.ingrediente).filter(Boolean);
  const endocrineAlerts = analysis.alertas.endocrinas ?? [];

  const item: ProductItem = {
    PK: `PRODUCT#${uid}`,
    SK: "PROFILE",
    GSI1PK: `BARCODE#${uid}`,
    GSI1SK: "PRODUCT",
    entityType: "PRODUCT",
    uid,
    id: uid,
    barcode: uid.match(/^\d{8,14}$/) ? uid : undefined,
    name: analysis.producto.nombre,
    brand: analysis.producto.marca,
    category: analysis.producto.categoria,
    score: analysis.producto.puntaje_global,
    ingredients,
    disruptors_summary:
      endocrineAlerts.length > 0
        ? endocrineAlerts.join(", ")
        : "Sin disruptores endocrinos identificados",
    labor_ethics: analysis.alertas.etica_laboral,
    endocrine_alerts: endocrineAlerts,
    health_alert: analysis.alertas.salud,
    chemical_analysis: analysis.analisis_quimico,
    verdict: analysis.veredicto,
    recommendation: analysis.recomendacion,
    analysis_raw: analysis,
    last_updated: timestamp,
  };

  await doc.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );

  return toProductRecord(item);
}

export async function ensureUserProfile(params: {
  userId: string;
  email?: string;
  name?: string;
  image?: string;
}): Promise<void> {
  const timestamp = nowIso();
  await doc.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: {
        PK: userPk(params.userId),
        SK: "PROFILE",
      },
      UpdateExpression:
        "SET entityType = if_not_exists(entityType, :entityType), #id = if_not_exists(#id, :id), #email = if_not_exists(#email, :email), #name = if_not_exists(#name, :name), #image = if_not_exists(#image, :image), #last_updated = :last_updated",
      ExpressionAttributeNames: {
        "#id": "id",
        "#email": "email",
        "#name": "name",
        "#image": "image",
        "#last_updated": "last_updated",
      },
      ExpressionAttributeValues: {
        ":entityType": "USER_PROFILE",
        ":id": params.userId,
        ":email": params.email ?? null,
        ":name": params.name ?? null,
        ":image": params.image ?? null,
        ":last_updated": timestamp,
      },
    }),
  );
}

export async function upsertUserScan(params: {
  userId: string;
  productUid: string;
  productName: string;
  score: number;
  category: ProductCategory;
}): Promise<void> {
  const timestamp = nowIso();
  const item: UserScanItem = {
    PK: userPk(params.userId),
    SK: `SCAN#${timestamp}#${params.productUid}`,
    entityType: "USER_SCAN",
    product_uid: params.productUid,
    product_name: params.productName,
    score: params.score,
    scanned_at: timestamp,
    product_category: params.category,
  };

  await doc.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );
}

export async function addShoppingListItem(params: {
  userId: string;
  product: ProductRecord;
}): Promise<ShoppingListItem> {
  const timestamp = nowIso();
  const item: ShoppingItem = {
    PK: userPk(params.userId),
    SK: `SHOPPING#${params.product.uid}`,
    GSI1PK: `PRODUCT#${params.product.uid}`,
    GSI1SK: `USER#${params.userId}`,
    entityType: "SHOPPING_ITEM",
    product_uid: params.product.uid,
    product_name: params.product.name,
    score: params.product.score,
    endocrine_risk_count: params.product.endocrine_alerts.length,
    added_at: timestamp,
  };

  await doc.send(
    new PutCommand({
      TableName: config.tableName,
      Item: item,
    }),
  );

  return {
    productUid: item.product_uid,
    productName: item.product_name,
    score: item.score,
    endocrineRiskCount: item.endocrine_risk_count,
    addedAt: item.added_at,
  };
}

export async function getUserScans(userId: string): Promise<UserScanRecord[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: config.tableName,
      KeyConditionExpression: "PK = :pk and begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": userPk(userId),
        ":prefix": "SCAN#",
      },
      ScanIndexForward: false,
      Limit: 20,
    }),
  );

  const items = (result.Items as UserScanItem[] | undefined) ?? [];
  return items.map((item) => ({
    productUid: item.product_uid,
    productName: item.product_name,
    score: item.score,
    scannedAt: item.scanned_at,
    category: normalizeStoredCategory(item.product_category),
  }));
}

export async function getShoppingListItems(
  userId: string,
): Promise<ShoppingListItem[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: config.tableName,
      KeyConditionExpression: "PK = :pk and begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": userPk(userId),
        ":prefix": "SHOPPING#",
      },
    }),
  );

  const items = (result.Items as ShoppingItem[] | undefined) ?? [];
  return items.map((item) => ({
    productUid: item.product_uid,
    productName: item.product_name,
    score: item.score,
    endocrineRiskCount: item.endocrine_risk_count,
    addedAt: item.added_at,
  }));
}

/** Borra todos los ítems de lista de compras del usuario (SK SHOPPING#…). */
export async function clearShoppingListForUser(userId: string): Promise<number> {
  return deleteUserItemsWithSkPrefix(userId, "SHOPPING#");
}

/** Borra entradas de historial de escaneos del usuario (SK SCAN#…). */
export async function clearRecentScansForUser(userId: string): Promise<number> {
  return deleteUserItemsWithSkPrefix(userId, "SCAN#");
}

async function deleteUserItemsWithSkPrefix(userId: string, skPrefix: string): Promise<number> {
  const pk = userPk(userId);
  let total = 0;
  for (;;) {
    const result = await doc.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: "PK = :pk and begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": skPrefix,
        },
        Limit: 25,
      }),
    );
    const raw = result.Items ?? [];
    if (raw.length === 0) {
      break;
    }
    const keys = raw.map((it) => ({
      PK: it.PK as string,
      SK: it.SK as string,
    }));
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [config.tableName]: keys.map((key) => ({
            DeleteRequest: { Key: key },
          })),
        },
      }),
    );
    total += keys.length;
  }
  return total;
}

export function evaluateShoppingList(items: ShoppingListItem[]): ShoppingListEvaluation {
  if (items.length === 0) {
    return {
      listSize: 0,
      averageScore: 0,
      riskProductCount: 0,
      riskPercentage: 0,
      basketGrade: "CANASTA_SALUDABLE",
      tooManyEndocrineRisk: false,
      recommendation: "Agrega productos para calcular la calificación de tu canasta.",
    };
  }

  const totalScore = items.reduce((acc, item) => acc + item.score, 0);
  const riskProductCount = items.filter((item) => item.endocrineRiskCount > 0).length;
  const averageScore = Number((totalScore / items.length).toFixed(2));
  const riskPercentage = Number(((riskProductCount / items.length) * 100).toFixed(2));
  const tooManyEndocrineRisk = riskPercentage >= 40;

  let basketGrade: ShoppingListEvaluation["basketGrade"] = "CANASTA_SALUDABLE";
  if (averageScore < 8 || tooManyEndocrineRisk) {
    basketGrade = "CANASTA_CRITICA";
  } else if (averageScore < 15) {
    basketGrade = "CANASTA_MIXTA";
  }

  const recommendation =
    basketGrade === "CANASTA_CRITICA"
      ? "Tu canasta tiene demasiados riesgos endocrinos o puntajes bajos. Prioriza reemplazar los productos por debajo de 10."
      : basketGrade === "CANASTA_MIXTA"
        ? "Buena base, pero puedes mejorar sustituyendo productos con EDC por alternativas más seguras."
        : "Excelente canasta. Mantén esta selección priorizando productos con mejor perfil químico y ético.";

  return {
    listSize: items.length,
    averageScore,
    riskProductCount,
    riskPercentage,
    basketGrade,
    tooManyEndocrineRisk,
    recommendation,
  };
}

// --- Catálogo global de ingredientes (deduplicado por nombre normalizado) ---

export function ingredientStorageKeyFromName(name: string): string {
  const n = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return createHash("sha256").update(n, "utf8").digest("hex").slice(0, 32);
}

function normalizeCalificacion(v: string): ChemicalAnalysisItem["calificacion"] {
  const x = (v ?? "").toLowerCase();
  if (x === "riesgo" || x === "risk") return "riesgo";
  if (x === "regular") return "regular";
  return "bueno";
}

export type IngredientCatalogRow = {
  canonicalName: string;
  descripcion: string;
  funcion: string;
  calificacion: ChemicalAnalysisItem["calificacion"];
  justificacion?: string;
};

export async function getIngredientProfile(name: string): Promise<IngredientCatalogRow | null> {
  const hash = ingredientStorageKeyFromName(name);
  const result = await doc.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `INGREDIENT#${hash}`, SK: "PROFILE" },
    }),
  );
  const item = result.Item as
    | {
        canonical_name: string;
        descripcion: string;
        funcion: string;
        calificacion: string;
        justificacion?: string;
      }
    | undefined;
  if (!item) return null;
  return {
    canonicalName: item.canonical_name,
    descripcion: item.descripcion,
    funcion: item.funcion,
    calificacion: normalizeCalificacion(item.calificacion),
    justificacion: (item.justificacion ?? "").trim() || undefined,
  };
}

export async function createIngredientIfAbsent(params: {
  normalizedFrom: string;
  canonicalName: string;
  descripcion: string;
  funcion: string;
  calificacion: ChemicalAnalysisItem["calificacion"];
  justificacion: string;
}): Promise<void> {
  const hash = ingredientStorageKeyFromName(params.normalizedFrom);
  const ts = nowIso();
  try {
    await doc.send(
      new PutCommand({
        TableName: config.tableName,
        Item: {
          PK: `INGREDIENT#${hash}`,
          SK: "PROFILE",
          entityType: "INGREDIENT",
          canonical_name: params.canonicalName,
          descripcion: params.descripcion,
          funcion: params.funcion,
          calificacion: params.calificacion,
          justificacion: params.justificacion,
          created_at: ts,
          updated_at: ts,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      return;
    }
    throw e;
  }
}

// --- Trabajos de análisis asíncrono ---

export async function createAnalysisJobRecord(
  jobId: string,
  userId: string,
  imageKeys: string[],
): Promise<void> {
  const ts = nowIso();
  await doc.send(
    new PutCommand({
      TableName: config.tableName,
      Item: {
        PK: `JOB#${jobId}`,
        SK: "META",
        entityType: "ANALYSIS_JOB",
        job_id: jobId,
        user_id: userId,
        image_keys: imageKeys,
        status: "PENDING",
        created_at: ts,
        updated_at: ts,
      },
    }),
  );
  await doc.send(
    new PutCommand({
      TableName: config.tableName,
      Item: {
        PK: userPk(userId),
        SK: `JOB#${jobId}`,
        entityType: "ANALYSIS_JOB_REF",
        job_id: jobId,
        status: "PENDING",
        created_at: ts,
        updated_at: ts,
      },
    }),
  );
}

export async function updateAnalysisJobStatus(params: {
  jobId: string;
  userId: string;
  status: AnalysisJobStatus;
  productUid?: string;
  errorMessage?: string;
}): Promise<void> {
  const ts = nowIso();
  const sets = ["#st = :st", "updated_at = :u"];
  const names: Record<string, string> = { "#st": "status" };
  const values: Record<string, unknown> = {
    ":st": params.status,
    ":u": ts,
  };
  if (params.productUid !== undefined) {
    sets.push("product_uid = :p");
    values[":p"] = params.productUid;
  }
  if (params.errorMessage !== undefined) {
    sets.push("error_message = :e");
    values[":e"] = params.errorMessage;
  }
  const expr = `SET ${sets.join(", ")}`;
  await doc.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { PK: `JOB#${params.jobId}`, SK: "META" },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
  const refSets = ["#st = :st", "updated_at = :u"];
  const refNames: Record<string, string> = { "#st": "status" };
  const refValues: Record<string, unknown> = { ":st": params.status, ":u": ts };
  if (params.productUid !== undefined) {
    refSets.push("product_uid = :p");
    refValues[":p"] = params.productUid;
  }
  if (params.errorMessage !== undefined) {
    refSets.push("error_message = :e");
    refValues[":e"] = params.errorMessage;
  }
  await doc.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { PK: userPk(params.userId), SK: `JOB#${params.jobId}` },
      UpdateExpression: `SET ${refSets.join(", ")}`,
      ExpressionAttributeNames: refNames,
      ExpressionAttributeValues: refValues,
    }),
  );
}

export async function getAnalysisJobMeta(
  jobId: string,
  expectedUserId?: string,
): Promise<AnalysisJobRecord | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `JOB#${jobId}`, SK: "META" },
    }),
  );
  const item = result.Item as
    | {
        job_id: string;
        user_id: string;
        image_keys: string[];
        status: AnalysisJobStatus;
        product_uid?: string;
        error_message?: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!item) return null;
  if (expectedUserId && item.user_id !== expectedUserId) {
    return null;
  }
  return {
    jobId: item.job_id,
    userId: item.user_id,
    status: item.status,
    imageKeys: item.image_keys,
    productUid: item.product_uid,
    errorMessage: item.error_message,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getUserAnalysisJobSummaries(userId: string): Promise<AnalysisJobSummary[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: config.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": userPk(userId),
        ":prefix": "JOB#",
      },
      ScanIndexForward: false,
      Limit: 20,
    }),
  );
  const items = (result.Items ?? []) as Array<{
    job_id: string;
    status: AnalysisJobStatus;
    product_uid?: string;
    error_message?: string;
    created_at: string;
  }>;
  return items.map((i) => ({
    jobId: i.job_id,
    status: i.status,
    productUid: i.product_uid,
    errorMessage: i.error_message,
    createdAt: i.created_at,
  }));
}
