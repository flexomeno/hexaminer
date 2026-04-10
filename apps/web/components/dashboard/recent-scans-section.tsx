"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Sparkles, SprayCan, UtensilsCrossed } from "lucide-react";
import type { ProductCategory, UserScanRecord } from "@/types/domain";

type FilterKey = "all" | ProductCategory;

const CATEGORY_FILTERS: {
  key: Exclude<ProductCategory, "Desconocido">;
  label: string;
  Icon: typeof UtensilsCrossed;
}[] = [
  { key: "Alimento", label: "Alimentos", Icon: UtensilsCrossed },
  { key: "Cosmético", label: "Cosméticos", Icon: Sparkles },
  { key: "Aseo", label: "Aseo", Icon: SprayCan },
];

function scanCategory(scan: UserScanRecord): ProductCategory {
  return scan.category ?? "Desconocido";
}

function scanMatchesFilter(scan: UserScanRecord, filter: FilterKey): boolean {
  if (filter === "all") return true;
  return scanCategory(scan) === filter;
}

function CategoryIcon({ category }: { category: ProductCategory }) {
  const cls = "h-4 w-4 shrink-0 text-slate-600";
  switch (category) {
    case "Alimento":
      return <UtensilsCrossed className={cls} aria-hidden />;
    case "Cosmético":
      return <Sparkles className={cls} aria-hidden />;
    case "Aseo":
      return <SprayCan className={cls} aria-hidden />;
    default:
      return (
        <span className="text-[10px] font-semibold text-slate-400" title="Sin clasificar">
          —
        </span>
      );
  }
}

export function RecentScansSection({ scans }: { scans: UserScanRecord[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = useMemo(
    () => scans.filter((s) => scanMatchesFilter(s, filter)),
    [scans, filter],
  );

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Filtrar historial por tipo de producto"
      >
        <button
          type="button"
          className={`${chipBase} ${
            filter === "all"
              ? "border-slate-800 bg-slate-800 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => setFilter("all")}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
          Todos
        </button>
        {CATEGORY_FILTERS.map(({ key, label, Icon }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              className={`${chipBase} ${
                active
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setFilter(key)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-800">
          No hay escaneos en esta categoría. Prueba otro filtro o escanea más productos.
        </p>
      ) : (
        visible.map((scan) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            key={`${scan.productUid}-${scan.scannedAt}`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50">
                <CategoryIcon category={scanCategory(scan)} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{scan.productName}</p>
                <p className="text-xs text-slate-600">{scan.scannedAt}</p>
              </div>
            </div>
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {scan.score}/20
            </span>
          </div>
        ))
      )}
    </div>
  );
}
