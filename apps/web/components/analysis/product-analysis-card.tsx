"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Leaf, ShieldCheck } from "lucide-react";
import type { ChemicalAnalysisItem, ProductRecord } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "./score-ring";

type ProductAnalysisCardProps = {
  product: ProductRecord;
};

type RiskTab = "riesgo" | "regular" | "bueno";

const TAB_LABELS: Record<RiskTab, string> = {
  riesgo: "Riesgoso",
  regular: "Regular",
  bueno: "Bueno",
};

function filterByTab(rows: ChemicalAnalysisItem[], tab: RiskTab): ChemicalAnalysisItem[] {
  return rows.filter((r) => r.calificacion === tab);
}

export function ProductAnalysisCard({ product }: ProductAnalysisCardProps) {
  const [tab, setTab] = useState<RiskTab>("riesgo");

  const counts = useMemo(() => {
    const rows = product.chemical_analysis;
    return {
      riesgo: filterByTab(rows, "riesgo").length,
      regular: filterByTab(rows, "regular").length,
      bueno: filterByTab(rows, "bueno").length,
    };
  }, [product.chemical_analysis]);

  const visible = useMemo(
    () => filterByTab(product.chemical_analysis, tab),
    [product.chemical_analysis, tab],
  );

  return (
    <Card className="text-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-slate-950">{product.name}</CardTitle>
          <p className="text-sm text-slate-700">
            {product.brand} · {product.category}
          </p>
        </div>
        <ScoreRing score={product.score} />
      </CardHeader>
      <CardContent className="space-y-5 text-slate-800">
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm">
          <p className="mb-2 font-semibold text-slate-950">Veredicto</p>
          <p className="leading-relaxed text-slate-900">{product.verdict}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              Alertas Endocrinas
            </p>
            {product.endocrine_alerts.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-sm leading-snug text-slate-800">
                {product.endocrine_alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-700">No se detectaron EDC relevantes.</p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Leaf className="h-4 w-4 shrink-0 text-emerald-700" />
              Salud
            </p>
            <p className="text-sm leading-relaxed text-slate-800">{product.health_alert}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" />
              Ética Laboral
            </p>
            <p className="text-sm leading-relaxed text-slate-800">{product.labor_ethics}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-950">Análisis químico</p>
          <div
            className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-2"
            role="tablist"
            aria-label="Filtrar por nivel de riesgo"
          >
            {(["riesgo", "regular", "bueno"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === key
                    ? key === "riesgo"
                      ? "bg-red-100 text-red-900"
                      : key === "regular"
                        ? "bg-amber-100 text-amber-950"
                        : "bg-emerald-100 text-emerald-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setTab(key)}
              >
                {TAB_LABELS[key]} ({counts[key]})
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {visible.length === 0 ? (
              <p className="text-sm text-slate-600">
                No hay ingredientes en esta categoría.
              </p>
            ) : (
              visible.map((entry) => (
                <div
                  key={`${entry.ingrediente}-${entry.funcion}-${entry.calificacion}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-slate-950">{entry.ingrediente}</p>
                  {entry.descripcion ? (
                    <p className="mt-1 leading-relaxed text-slate-700">{entry.descripcion}</p>
                  ) : null}
                  <p className="mt-1 text-slate-600">
                    <span className="font-medium text-slate-800">Función: </span>
                    {entry.funcion}
                  </p>
                  {entry.justificacion ? (
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800">
                      <span className="text-xs font-semibold text-slate-600">
                        Justificación ({entry.calificacion}):{" "}
                      </span>
                      <span className="text-sm leading-relaxed">{entry.justificacion}</span>
                    </p>
                  ) : null}
                  <p className="mt-2 inline-block rounded-md bg-slate-200 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-900">
                    {entry.calificacion}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
