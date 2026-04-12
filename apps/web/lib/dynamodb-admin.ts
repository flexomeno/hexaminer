import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

import type { AdminListQuery } from "@/lib/admin-list-url";

const ROWS_PER_PAGE = 50;
const EVAL_ITEMS_PER_SCAN = 800;
/** Tope de filas cargadas en memoria para filtrar/ordenar (panel admin). */
const MAX_ADMIN_LIST_ITEMS = 10_000;

function getDoc() {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function getTableName(): string | null {
  const t = process.env.TABLE_NAME?.trim();
  return t || null;
}

/** Serializa ítems Dynamo (p. ej. Decimal) a JSON seguro para el cliente. */
export function serializeItems(items: Record<string, unknown>[]): unknown[] {
  return JSON.parse(JSON.stringify(items)) as unknown[];
}

export type AdminListPageResult = {
  items: Record<string, unknown>[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  /** Índice global 0-based de la primera fila en esta página. */
  startRowOffset: number;
  q: string;
  sort: string;
  dir: "asc" | "desc";
  truncated: boolean;
  error?: string;
};

export const PRODUCT_SORT_KEYS = ["uid", "name", "brand", "score", "updated"] as const;
export const INGREDIENT_SORT_KEYS = ["pk", "name", "cal", "funcion", "updated"] as const;

function normalizeTableKey(
  key: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!key || typeof key !== "object") return undefined;
  const PK = key.PK != null ? String(key.PK) : "";
  const SK = key.SK != null ? String(key.SK) : "";
  if (!PK || !SK) return undefined;
  return { PK, SK };
}

async function scanAllFiltered(params: {
  TableName: string;
  FilterExpression: string;
  ExpressionAttributeValues: Record<string, unknown>;
}): Promise<{ items: Record<string, unknown>[]; truncated: boolean }> {
  const doc = getDoc();
  const out: Record<string, unknown>[] = [];
  let eks: Record<string, unknown> | undefined;
  let truncated = false;
  do {
    const result = await doc.send(
      new ScanCommand({
        TableName: params.TableName,
        FilterExpression: params.FilterExpression,
        ExpressionAttributeValues: params.ExpressionAttributeValues,
        Limit: EVAL_ITEMS_PER_SCAN,
        ExclusiveStartKey: eks,
      }),
    );
    out.push(...((result.Items ?? []) as Record<string, unknown>[]));
    const rawLek = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    eks = normalizeTableKey(rawLek) ?? rawLek;
    if (out.length >= MAX_ADMIN_LIST_ITEMS) {
      truncated = Boolean(eks);
      break;
    }
  } while (eks);
  return { items: out, truncated };
}

function matchesQuery(haystack: string, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const h = haystack.toLowerCase();
  return needle.split(/\s+/).every((w) => w.length > 0 && h.includes(w));
}

function productHaystack(it: Record<string, unknown>): string {
  return [it.uid, it.id, it.name, it.brand].map((x) => String(x ?? "")).join(" \n ");
}

function ingredientHaystack(it: Record<string, unknown>): string {
  return [it.PK, it.canonical_name, it.calificacion, it.funcion].map((x) => String(x ?? "")).join(" \n ");
}

function pickProductSortValue(it: Record<string, unknown>, key: string): string | number {
  switch (key) {
    case "uid":
      return String(it.uid ?? it.id ?? "");
    case "name":
      return String(it.name ?? "");
    case "brand":
      return String(it.brand ?? "");
    case "score": {
      const s = it.score;
      const n = typeof s === "number" ? s : parseFloat(String(s ?? ""));
      return Number.isFinite(n) ? n : 0;
    }
    case "updated":
      return String(it.last_updated ?? "");
    default:
      return String(it.uid ?? it.id ?? "");
  }
}

function pickIngredientSortValue(it: Record<string, unknown>, key: string): string | number {
  switch (key) {
    case "pk":
      return String(it.PK ?? "");
    case "name":
      return String(it.canonical_name ?? "");
    case "cal":
      return String(it.calificacion ?? "");
    case "funcion":
      return String(it.funcion ?? "");
    case "updated":
      return String(it.updated_at ?? it.created_at ?? "");
    default:
      return String(it.PK ?? "");
  }
}

function compareValues(
  a: string | number,
  b: string | number,
  dir: "asc" | "desc",
): number {
  const sign = dir === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") {
    if (a < b) return -1 * sign;
    if (a > b) return 1 * sign;
    return 0;
  }
  const cmp = String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
  return cmp * sign;
}

function sortProducts(items: Record<string, unknown>[], sort: string, dir: "asc" | "desc") {
  const key = PRODUCT_SORT_KEYS.includes(sort as (typeof PRODUCT_SORT_KEYS)[number])
    ? sort
    : "uid";
  return [...items].sort((x, y) =>
    compareValues(pickProductSortValue(x, key), pickProductSortValue(y, key), dir),
  );
}

function sortIngredients(items: Record<string, unknown>[], sort: string, dir: "asc" | "desc") {
  const key = INGREDIENT_SORT_KEYS.includes(sort as (typeof INGREDIENT_SORT_KEYS)[number])
    ? sort
    : "pk";
  return [...items].sort((x, y) =>
    compareValues(pickIngredientSortValue(x, key), pickIngredientSortValue(y, key), dir),
  );
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export async function listProductAdminPage(query: AdminListQuery): Promise<AdminListPageResult> {
  const TableName = getTableName();
  if (!TableName) {
    return {
      items: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: 0,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated: false,
      error: "Falta TABLE_NAME en el entorno del servidor.",
    };
  }

  try {
    const { items: raw, truncated } = await scanAllFiltered({
      TableName,
      FilterExpression: "entityType = :et AND SK = :sk",
      ExpressionAttributeValues: {
        ":et": "PRODUCT",
        ":sk": "PROFILE",
      },
    });
    const filtered = query.q.trim()
      ? raw.filter((it) => matchesQuery(productHaystack(it), query.q))
      : raw;
    const sorted = sortProducts(filtered, query.sort, query.dir);
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE) || 1);
    const page = Math.min(Math.max(1, query.page), totalPages);
    const pageItems = paginate(sorted, page, ROWS_PER_PAGE);

    return {
      items: pageItems,
      totalCount,
      page,
      totalPages,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: (page - 1) * ROWS_PER_PAGE,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      items: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: 0,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated: false,
      error: `DynamoDB: ${msg}`,
    };
  }
}

export async function listIngredientAdminPage(query: AdminListQuery): Promise<AdminListPageResult> {
  const TableName = getTableName();
  if (!TableName) {
    return {
      items: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: 0,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated: false,
      error: "Falta TABLE_NAME en el entorno del servidor.",
    };
  }

  try {
    const { items: raw, truncated } = await scanAllFiltered({
      TableName,
      FilterExpression: "entityType = :et AND SK = :sk",
      ExpressionAttributeValues: {
        ":et": "INGREDIENT",
        ":sk": "PROFILE",
      },
    });
    const filtered = query.q.trim()
      ? raw.filter((it) => matchesQuery(ingredientHaystack(it), query.q))
      : raw;
    const sorted = sortIngredients(filtered, query.sort, query.dir);
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / ROWS_PER_PAGE) || 1);
    const page = Math.min(Math.max(1, query.page), totalPages);
    const pageItems = paginate(sorted, page, ROWS_PER_PAGE);

    return {
      items: pageItems,
      totalCount,
      page,
      totalPages,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: (page - 1) * ROWS_PER_PAGE,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      items: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
      pageSize: ROWS_PER_PAGE,
      startRowOffset: 0,
      q: query.q,
      sort: query.sort,
      dir: query.dir,
      truncated: false,
      error: `DynamoDB: ${msg}`,
    };
  }
}
