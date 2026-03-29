"use client";

import { AlertTriangle, Leaf, ShieldCheck } from "lucide-react";
import type { ProductRecord } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "./score-ring";

type ProductAnalysisCardProps = {
  product: ProductRecord;
};

export function ProductAnalysisCard({ product }: ProductAnalysisCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{product.name}</CardTitle>
          <p className="text-sm text-zinc-600">
            {product.brand} · {product.category}
          </p>
        </div>
        <ScoreRing score={product.score} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <p className="mb-1 font-semibold">Veredicto</p>
          <p>{product.verdict}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alertas Endocrinas
            </p>
            {product.endocrine_alerts.length > 0 ? (
              <ul className="list-disc pl-4 text-sm">
                {product.endocrine_alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600">No se detectaron EDC relevantes.</p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <Leaf className="h-4 w-4 text-emerald-600" />
              Salud
            </p>
            <p className="text-sm">{product.health_alert}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Ética Laboral
            </p>
            <p className="text-sm">{product.labor_ethics}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Análisis químico</p>
          <div className="space-y-2">
            {product.chemical_analysis.map((entry) => (
              <div
                key={`${entry.ingrediente}-${entry.funcion}`}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <p className="font-medium">{entry.ingrediente}</p>
                <p className="text-zinc-600">{entry.funcion}</p>
                <p className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase">
                  {entry.calificacion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
