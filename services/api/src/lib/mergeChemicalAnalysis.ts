import type { ChemicalAnalysisItem } from "../types/domain";
import { createIngredientIfAbsent, getIngredientProfile } from "./dynamo";

const RISK_ORDER: Record<ChemicalAnalysisItem["calificacion"], number> = {
  riesgo: 0,
  regular: 1,
  bueno: 2,
};

function normalizeCalificacion(
  v: string | undefined,
): ChemicalAnalysisItem["calificacion"] {
  const x = (v ?? "").toLowerCase();
  if (x === "riesgo" || x === "risk") return "riesgo";
  if (x === "regular") return "regular";
  return "bueno";
}

/**
 * Enriquece filas con catálogo global de ingredientes (sin volver a “inferir” si ya existe).
 * Orden: más riesgosos primero.
 */
export async function mergeAndSortChemicalRows(
  rows: ChemicalAnalysisItem[],
): Promise<ChemicalAnalysisItem[]> {
  const merged: ChemicalAnalysisItem[] = [];

  for (const row of rows) {
    const ingrediente = (row.ingrediente ?? "").trim();
    if (!ingrediente) continue;

    const existing = await getIngredientProfile(ingrediente);
    if (existing) {
      const justFromRow = (row.justificacion ?? "").trim();
      const justificacion =
        (existing.justificacion ?? "").trim() || justFromRow || undefined;
      merged.push({
        ingrediente: existing.canonicalName,
        descripcion: existing.descripcion,
        funcion: existing.funcion,
        calificacion: existing.calificacion,
        justificacion,
      });
      continue;
    }

    const calificacion = normalizeCalificacion(row.calificacion);
    const funcion = (row.funcion ?? "").trim() || "—";
    const descripcion = (row.descripcion ?? "").trim() || funcion;
    const justificacion =
      (row.justificacion ?? "").trim() ||
      (calificacion === "riesgo"
        ? "Clasificado como riesgoso según criterios de seguridad o EDC."
        : calificacion === "regular"
          ? "Clasificado como regular: uso aceptable con matices."
          : "Clasificado como favorable en este contexto.");

    const fresh: ChemicalAnalysisItem = {
      ingrediente,
      descripcion,
      funcion,
      calificacion,
      justificacion,
    };
    merged.push(fresh);
    await createIngredientIfAbsent({
      normalizedFrom: ingrediente,
      canonicalName: ingrediente,
      descripcion,
      funcion,
      calificacion,
      justificacion,
    });
  }

  return merged.sort((a, b) => {
    const d = RISK_ORDER[a.calificacion] - RISK_ORDER[b.calificacion];
    if (d !== 0) return d;
    return a.ingrediente.localeCompare(b.ingrediente, "es");
  });
}
