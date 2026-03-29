import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config";
import type {
  ProductAiAnalysis,
  ProductRecord,
  ProductCategory,
  ShoppingListItem,
  ShoppingListEvaluation,
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
  analysis_raw: ProductAiAnalysis;
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
};

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
