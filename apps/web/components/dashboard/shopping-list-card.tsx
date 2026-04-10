"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShoppingListItem } from "@/types/domain";
import { resetUserSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ShoppingListCardProps = {
  items: ShoppingListItem[];
  userId?: string;
};

export function ShoppingListCard({ items, userId }: ShoppingListCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onReset() {
    if (
      !window.confirm(
        "¿Vaciar por completo la lista de compras? El historial de escaneos no se modifica. Los productos del catálogo global no se eliminan.",
      )
    ) {
      return;
    }
    if (!userId) return;
    setBusy(true);
    try {
      await resetUserSession(
        { shoppingList: true, recentScans: false },
        { userId },
      );
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "No se pudo reiniciar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Productos en la lista</CardTitle>
          <CardDescription>
            Productos añadidos desde los análisis. Puedes vaciar solo la lista de
            compras; el historial de escaneos se mantiene.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy || !userId}
          onClick={onReset}
          className="shrink-0"
        >
          {busy ? "Vaciando…" : "Vaciar lista de compras"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!userId ? (
          <p className="text-sm text-slate-600">
            Inicia sesión para ver y vaciar tu lista de compras.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-700">
            No hay productos en la lista. Al completar un análisis desde la app se
            pueden añadir aquí.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {items.map((item) => (
              <li
                key={item.productUid}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-900">{item.productName}</span>
                <span className="text-xs text-slate-600">
                  {item.score}/20 · EDC: {item.endocrineRiskCount}
                </span>
              </li>
            ))}
          </ul>
        )}
        {userId ? (
          <p className="text-xs text-slate-500">
            Solo se quitan los productos de tu canasta; el historial de escaneos no
            cambia (no borra productos del catálogo).
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
