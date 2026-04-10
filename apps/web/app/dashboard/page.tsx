import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ShoppingBasket } from "lucide-react";

export default async function DashboardOverviewPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email
    ? `email#${session.user.email.toLowerCase()}`
    : undefined;
  const dashboard = await getDashboard({ userId }).catch(() => null);

  const scanCount = dashboard?.recent_scans?.length ?? 0;
  const listCount = dashboard?.shopping_list?.length ?? 0;
  const pending = dashboard?.pending_jobs?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel</h1>
      <p className="text-sm text-slate-600">
        Resumen de tu actividad. Abre el historial o la lista de compras en las pestañas
        de arriba.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Análisis en proceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending === 0 ? (
            <p className="text-sm text-slate-700">
              No hay escaneos pendientes. Al analizar desde la cámara, el resultado
              aparecerá aquí unos segundos y luego en el historial.
            </p>
          ) : (
            dashboard?.pending_jobs?.map((job) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    {job.status === "PENDING" ? "En cola" : "Procesando…"}
                  </p>
                  <p className="text-xs text-amber-900/80">{job.createdAt}</p>
                </div>
                <span className="text-xs font-medium text-amber-950">{job.status}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/historial">
          <Card className="h-full transition-colors hover:border-slate-300 hover:bg-slate-50/80">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <History className="h-8 w-8 text-slate-700" aria-hidden />
              <div>
                <CardTitle className="text-base">Historial de escaneos</CardTitle>
                <p className="text-sm text-slate-600">
                  {scanCount === 0
                    ? "Aún sin escaneos recientes"
                    : `${scanCount} registro${scanCount === 1 ? "" : "s"} reciente${scanCount === 1 ? "" : "s"}`}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">Abrir historial →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/lista-compras">
          <Card className="h-full transition-colors hover:border-slate-300 hover:bg-slate-50/80">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <ShoppingBasket className="h-8 w-8 text-slate-700" aria-hidden />
              <div>
                <CardTitle className="text-base">Lista de compras</CardTitle>
                <p className="text-sm text-slate-600">
                  {listCount === 0
                    ? "Canasta vacía"
                    : `${listCount} producto${listCount === 1 ? "" : "s"}`}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">Abrir lista →</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
